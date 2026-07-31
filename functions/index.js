"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { analyzePowerBundle } = require("./lib/trends");
const { classifyLatLon } = require("./lib/vision");

setGlobalOptions({ region: "us-central1" });

if (!getApps().length) initializeApp();

const earthdataToken = defineSecret("EARTHDATA_TOKEN");

// ---------- helpers ----------

async function verifyIdToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw Object.assign(new Error("Unauthenticated"), { status: 401 });
  const decoded = await getAuth().verifyIdToken(token);
  return decoded;
}

function jsonRes(res, status, body) {
  res.status(status).json(body);
}

function isTokenReal(val) {
  return Boolean(val && val.length > 30 && !val.startsWith("PLACEHOLDER"));
}

// ---------- rate-limiting ----------
// Simple in-memory (per instance). Good enough for MVP; replace with Firestore counter later.
const rateMap = new Map(); // key → lastCallMs
const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 min

function checkRateLimit(key) {
  const last = rateMap.get(key) || 0;
  const now = Date.now();
  if (now - last < RATE_LIMIT_MS) {
    return Math.ceil((RATE_LIMIT_MS - (now - last)) / 60000);
  }
  rateMap.set(key, now);
  return 0;
}

// ---------- POWER parameters ----------
const POWER_PARAMS = [
  "T2M",         // temp 2m °C
  "T2M_MAX",     // max temp
  "T2M_MIN",     // min temp
  "RH2M",        // relative humidity %
  "WS2M",        // wind speed m/s
  "PRECTOTCORR", // rainfall mm/day
  "ALLSKY_SFC_SW_DWN", // solar radiation kWh/m²/day
  "EVPTRNS",     // evapotranspiration mm/day
].join(",");

// ---------- Function: earthdataStatus ----------
exports.earthdataStatus = onRequest(
  { secrets: [earthdataToken], cors: true },
  (req, res) => {
    const t = earthdataToken.value();
    const ok = isTokenReal(t);
    jsonRes(res, 200, {
      ok,
      configured: ok,
      hint: ok
        ? "Earthdata token loaded."
        : "Run: firebase functions:secrets:set EARTHDATA_TOKEN",
    });
  }
);

// ---------- Function: powerSummary ----------
exports.powerSummary = onRequest(
  { cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return jsonRes(res, 400, { error: "lat and lon are required" });
      }

      const days = Math.min(Number(req.query.days || 7), 30);
      const endDate = new Date();
      const startDate = new Date(endDate - days * 86400000);
      const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

      const url = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");
      url.searchParams.set("parameters", POWER_PARAMS);
      url.searchParams.set("community", "AG");
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("start", fmt(startDate));
      url.searchParams.set("end", fmt(endDate));
      url.searchParams.set("format", "JSON");

      const response = await fetch(url.toString());
      if (!response.ok) {
        const text = await response.text();
        return jsonRes(res, 502, { error: "POWER API error", detail: text.slice(0, 400) });
      }
      const data = await response.json();
      const props = data?.properties?.parameter || {};

      // Normalize to simple arrays keyed by date
      const normalized = {
        lat: Number(lat),
        lon: Number(lon),
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
        temp: props.T2M || {},
        tempMax: props.T2M_MAX || {},
        tempMin: props.T2M_MIN || {},
        humidity: props.RH2M || {},
        wind: props.WS2M || {},
        rainfall: props.PRECTOTCORR || {},
        solar: props.ALLSKY_SFC_SW_DWN || {},
        et: props.EVPTRNS || {},
        fetchedAt: new Date().toISOString(),
        uid: decoded.uid,
      };

      // Persist snapshot to Firestore if fieldId provided
      const { fieldId } = req.query;
      if (fieldId) {
        const db = getFirestore();
        const today = endDate.toISOString().slice(0, 10);
        await db
          .collection("users")
          .doc(decoded.uid)
          .collection("fields")
          .doc(String(fieldId))
          .collection("snapshots")
          .doc(today)
          .set({ power: normalized, savedAt: FieldValue.serverTimestamp() }, { merge: true });
      }

      jsonRes(res, 200, { ok: true, data: normalized });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("powerSummary error", err);
      jsonRes(res, 500, { error: err.message || "Unexpected error" });
    }
  }
);

// ---------- Function: fieldEarthSummary ----------
exports.fieldEarthSummary = onRequest(
  { secrets: [earthdataToken], cors: true, timeoutSeconds: 90 },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const token = earthdataToken.value();

      if (!isTokenReal(token)) {
        return jsonRes(res, 200, {
          ok: false,
          reason: "token_placeholder",
          message: "Connect your Earthdata token to unlock satellite layers.",
          instructions: "firebase functions:secrets:set EARTHDATA_TOKEN",
        });
      }

      const { lat, lon, fieldId } = req.query;
      if (!lat || !lon) return jsonRes(res, 400, { error: "lat and lon required" });

      const margin = 0.1;
      const bbox = `${Number(lon) - margin},${Number(lat) - margin},${Number(lon) + margin},${Number(lat) + margin}`;

      const end = new Date();
      const start = new Date(end - 14 * 86400000);
      const temporal = `${start.toISOString().slice(0, 10)}T00:00:00Z,${end.toISOString().slice(0, 10)}T23:59:59Z`;

      async function cmrSearch(shortName) {
        const params = new URLSearchParams({
          short_name: shortName,
          bounding_box: bbox,
          temporal,
          page_size: "3",
        });
        const r = await fetch(
          `https://cmr.earthdata.nasa.gov/search/granules.json?${params}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        if (!r.ok) return { available: false, count: 0 };
        const body = await r.json();
        const entries = body?.feed?.entry || [];
        return {
          available: entries.length > 0,
          count: entries.length,
          latest: entries[0]
            ? {
                id: entries[0].id,
                time: entries[0].time_start,
                title: entries[0].title,
              }
            : null,
        };
      }

      const [smap, modis] = await Promise.all([
        cmrSearch("SPL3SMP_E"),
        cmrSearch("MOD13Q1"),
      ]);

      const summary = {
        ok: true,
        bbox,
        temporal,
        smap,
        modis,
        fetchedAt: new Date().toISOString(),
      };

      if (fieldId) {
        const db = getFirestore();
        const today = end.toISOString().slice(0, 10);
        await db
          .collection("users")
          .doc(decoded.uid)
          .collection("fields")
          .doc(String(fieldId))
          .collection("snapshots")
          .doc(today)
          .set({ earth: summary, savedAt: FieldValue.serverTimestamp() }, { merge: true });
      }

      jsonRes(res, 200, summary);
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("fieldEarthSummary error", err);
      jsonRes(res, 500, { error: err.message || "Unexpected error" });
    }
  }
);

// ---------- Function: fuseFieldInsight ----------
exports.fuseFieldInsight = onRequest(
  { secrets: [earthdataToken], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const { fieldId, lat, lon } = req.query;
      if (!fieldId || !lat || !lon) {
        return jsonRes(res, 400, { error: "fieldId, lat, lon are required" });
      }

      // Rate limit per user+field (15 min)
      const ratKey = `${decoded.uid}:${fieldId}`;
      const waitMin = checkRateLimit(ratKey);
      if (waitMin > 0) {
        return jsonRes(res, 429, {
          error: "Rate limited",
          retryInMinutes: waitMin,
          message: `Refresh available in ${waitMin} minute(s).`,
        });
      }

      // Fetch POWER (no auth needed server-side; we forward user token for our own auth)
      const days = 7;
      const endDate = new Date();
      const startDate = new Date(endDate - days * 86400000);
      const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
      const powerUrl = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");
      powerUrl.searchParams.set("parameters", POWER_PARAMS);
      powerUrl.searchParams.set("community", "AG");
      powerUrl.searchParams.set("longitude", String(lon));
      powerUrl.searchParams.set("latitude", String(lat));
      powerUrl.searchParams.set("start", fmt(startDate));
      powerUrl.searchParams.set("end", fmt(endDate));
      powerUrl.searchParams.set("format", "JSON");

      const powerRes = await fetch(powerUrl.toString());
      let power = {};
      if (powerRes.ok) {
        const raw = await powerRes.json();
        power = raw?.properties?.parameter || {};
      }

      // Extract 7-day sums / averages from POWER
      function avg(obj) {
        const vals = Object.values(obj).filter((v) => Number.isFinite(v) && v !== -999);
        if (!vals.length) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      function sum(obj) {
        const vals = Object.values(obj).filter((v) => Number.isFinite(v) && v !== -999);
        if (!vals.length) return null;
        return vals.reduce((a, b) => a + b, 0);
      }

      const metrics = {
        totalRain_mm: sum(power.PRECTOTCORR),
        avgTemp_c: avg(power.T2M),
        maxTemp_c: avg(power.T2M_MAX),
        avgHumidity_pct: avg(power.RH2M),
        avgSolar: avg(power.ALLSKY_SFC_SW_DWN),
        totalET_mm: sum(power.EVPTRNS),
        powerDays: days,
      };

      // Earthdata flags (optional, soft fail)
      let earthFlags = { smapAvailable: false, modisAvailable: false };
      const token = earthdataToken.value();
      if (isTokenReal(token)) {
        try {
          const margin = 0.1;
          const bbox = `${Number(lon) - margin},${Number(lat) - margin},${Number(lon) + margin},${Number(lat) + margin}`;
          const temporal = `${startDate.toISOString().slice(0, 10)}T00:00:00Z,${endDate.toISOString().slice(0, 10)}T23:59:59Z`;
          async function cmr(name) {
            const p = new URLSearchParams({ short_name: name, bounding_box: bbox, temporal, page_size: "1" });
            const r = await fetch(`https://cmr.earthdata.nasa.gov/search/granules.json?${p}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const b = r.ok ? await r.json() : {};
            return (b?.feed?.entry?.length || 0) > 0;
          }
          const [s, m] = await Promise.all([cmr("SPL3SMP_E"), cmr("MOD13Q1")]);
          earthFlags = { smapAvailable: s, modisAvailable: m };
        } catch {
          // non-fatal
        }
      }

      // ---- Fusion rules ----
      const factors = [];
      let level = "info";
      let titleKey = "conditions_ok";

      const rain = metrics.totalRain_mm;
      const et = metrics.totalET_mm;
      const temp = metrics.avgTemp_c;
      const maxTemp = metrics.maxTemp_c;
      const humidity = metrics.avgHumidity_pct;

      // Rule 1: Irrigation needed
      if (rain !== null && et !== null && rain < 5 && et > 10) {
        level = "action";
        titleKey = "irrigate_soon";
        factors.push(`Only ${rain?.toFixed(1)} mm rain in 7 days vs ${et?.toFixed(1)} mm ET demand`);
      } else if (rain !== null && et !== null && rain < 12 && et > 8) {
        level = "watch";
        titleKey = "low_moisture";
        factors.push(`Low rainfall (${rain?.toFixed(1)} mm) relative to ET demand`);
      }

      // Rule 2: Heat stress
      if (maxTemp !== null && maxTemp > 37) {
        level = level === "action" ? "action" : "watch";
        titleKey = titleKey === "irrigate_soon" ? "irrigate_soon" : "heat_stress";
        factors.push(`Max temperature ${maxTemp?.toFixed(1)}°C exceeds heat stress threshold`);
      }

      // Rule 3: Heavy rainfall risk
      if (rain !== null && rain > 60) {
        level = level === "action" ? "action" : "watch";
        titleKey = "excess_rain";
        factors.push(`Heavy rainfall: ${rain?.toFixed(1)} mm in 7 days — watch for waterlogging`);
      }

      // Rule 4: High humidity disease risk
      if (humidity !== null && humidity > 85 && maxTemp !== null && maxTemp > 28) {
        if (level === "info") { level = "watch"; titleKey = "disease_risk"; }
        factors.push(`High humidity (${humidity?.toFixed(0)}%) + warm temps increase disease risk`);
      }

      // Rule 5: Good conditions
      if (factors.length === 0) {
        factors.push("Rainfall, temperature and ET are within normal range");
      }

      const TITLES = {
        irrigate_soon: "Irrigate tomorrow",
        low_moisture: "Moisture deficit — monitor closely",
        heat_stress: "High temperature stress detected",
        excess_rain: "Excess rainfall — check drainage",
        disease_risk: "Disease risk elevated",
        conditions_ok: "Field conditions look good",
      };

      const MESSAGES = {
        irrigate_soon: "Rainfall deficit detected. Plan irrigation within 24 hours to avoid crop stress.",
        low_moisture: "Below-average rainfall with above-average ET. Consider light irrigation and monitor soil.",
        heat_stress: "Temperatures are above the stress threshold. Consider cooling irrigation and shade if possible.",
        excess_rain: "Rainfall is high this week. Ensure drainage is clear and watch for fungal disease.",
        disease_risk: "Warm, humid conditions favour fungal pathogens. Scout your crop and consider preventive measures.",
        conditions_ok: "No immediate action required. Continue monitoring as conditions can change quickly.",
      };

      const insight = {
        level,
        title: TITLES[titleKey] || TITLES.conditions_ok,
        message: MESSAGES[titleKey] || MESSAGES.conditions_ok,
        factors,
        metrics,
        earthFlags,
        generatedAt: new Date().toISOString(),
      };

      // Persist to Firestore
      const db = getFirestore();
      const fieldRef = db.collection("users").doc(decoded.uid).collection("fields").doc(String(fieldId));

      await fieldRef.collection("insights").doc("latest").set({
        ...insight,
        savedAt: FieldValue.serverTimestamp(),
      });

      // Write alert if action/watch
      if (level === "action" || level === "watch") {
        await db.collection("users").doc(decoded.uid).collection("alerts").add({
          fieldId: String(fieldId),
          level,
          title: insight.title,
          message: insight.message,
          factors: insight.factors,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Update field's last insight summary
      await fieldRef.update({
        lastInsight: {
          level,
          title: insight.title,
          generatedAt: insight.generatedAt,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => {});

      jsonRes(res, 200, { ok: true, insight });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("fuseFieldInsight error", err);
      jsonRes(res, 500, { error: err.message || "Unexpected error" });
    }
  }
);

// ---------- Function: getAlerts ----------
exports.getAlerts = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const db = getFirestore();
      const snap = await db
        .collection("users")
        .doc(decoded.uid)
        .collection("alerts")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
      const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      jsonRes(res, 200, { ok: true, alerts });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      jsonRes(res, 500, { error: err.message });
    }
  }
);

// ---------- Function: markAlertRead ----------
exports.markAlertRead = onRequest(
  { cors: true, timeoutSeconds: 20 },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const { alertId } = req.query;
      if (!alertId) return jsonRes(res, 400, { error: "alertId required" });
      const db = getFirestore();
      await db
        .collection("users")
        .doc(decoded.uid)
        .collection("alerts")
        .doc(String(alertId))
        .update({ read: true });
      jsonRes(res, 200, { ok: true });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      jsonRes(res, 500, { error: err.message });
    }
  }
);

// ---------- Function: fieldTrends (history + forecast) ----------
exports.fieldTrends = onRequest(
  { cors: true, timeoutSeconds: 90 },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const { fieldId, lat, lon } = req.query;
      if (!fieldId || !lat || !lon) {
        return jsonRes(res, 400, { error: "fieldId, lat, lon required" });
      }

      // Prefer latest POWER snapshot; else fetch fresh 30-day POWER
      const db = getFirestore();
      let power = null;
      const snaps = await db
        .collection("users")
        .doc(decoded.uid)
        .collection("fields")
        .doc(String(fieldId))
        .collection("snapshots")
        .orderBy("savedAt", "desc")
        .limit(10)
        .get()
        .catch(() => null);

      const history = [];
      if (snaps && !snaps.empty) {
        snaps.docs.forEach((d) => {
          const data = d.data();
          history.push({
            id: d.id,
            savedAt: data.savedAt || null,
            hasPower: Boolean(data.power),
            insightLevel: data.insight?.level || null,
          });
          if (!power && data.power) power = data.power;
        });
      }

      if (!power) {
        const days = 30;
        const endDate = new Date();
        const startDate = new Date(endDate - days * 86400000);
        const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
        const powerUrl = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");
        powerUrl.searchParams.set("parameters", POWER_PARAMS);
        powerUrl.searchParams.set("community", "AG");
        powerUrl.searchParams.set("longitude", String(lon));
        powerUrl.searchParams.set("latitude", String(lat));
        powerUrl.searchParams.set("start", fmt(startDate));
        powerUrl.searchParams.set("end", fmt(endDate));
        powerUrl.searchParams.set("format", "JSON");
        const powerRes = await fetch(powerUrl.toString());
        if (powerRes.ok) {
          const raw = await powerRes.json();
          const props = raw?.properties?.parameter || {};
          power = {
            rainfall: props.PRECTOTCORR || {},
            temp: props.T2M || {},
            et: props.EVPTRNS || {},
            humidity: props.RH2M || {},
            solar: props.ALLSKY_SFC_SW_DWN || {},
          };
          const today = endDate.toISOString().slice(0, 10);
          await db
            .collection("users")
            .doc(decoded.uid)
            .collection("fields")
            .doc(String(fieldId))
            .collection("snapshots")
            .doc(today)
            .set({ power: { ...power, fetchedAt: new Date().toISOString() }, savedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }

      if (!power) {
        return jsonRes(res, 502, { error: "Could not load weather history from NASA POWER" });
      }

      const analysis = analyzePowerBundle(power, 7);

      // Past insight history (latest doc + any stored on snapshots)
      let pastInsights = [];
      const latestInsight = await db
        .collection("users")
        .doc(decoded.uid)
        .collection("fields")
        .doc(String(fieldId))
        .collection("insights")
        .doc("latest")
        .get();
      if (latestInsight.exists) {
        pastInsights.push({ id: "latest", ...latestInsight.data() });
      }

      jsonRes(res, 200, {
        ok: true,
        fieldId: String(fieldId),
        historySnapshots: history,
        pastInsights,
        ...analysis,
      });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("fieldTrends error", err);
      jsonRes(res, 500, { error: err.message || "Unexpected error" });
    }
  }
);

// ---------- Function: classifyLocation (field vs city/other) ----------
exports.classifyLocation = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "512MiB" },
  async (req, res) => {
    try {
      await verifyIdToken(req);
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonRes(res, 400, { error: "lat and lon required" });
      }

      const result = await classifyLatLon(lat, lon);
      const valid = Boolean(result.is_field);
      jsonRes(res, 200, {
        ok: true,
        valid,
        ...result,
        message: valid
          ? "Looks like agricultural land — you can save this field."
          : "This location does not look like a farm field (city/water/bare land). Pick a cropped area.",
      });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("classifyLocation error", err);
      // Soft-fail: allow save with warning if imagery unavailable
      jsonRes(res, 200, {
        ok: false,
        valid: true,
        softFail: true,
        message: "Could not verify imagery right now. You can still save — verification skipped.",
        error: err.message,
      });
    }
  }
);

// ---------- Function: cmrSearch (legacy, now auth-gated) ----------
exports.cmrSearch = onRequest(
  { secrets: [earthdataToken], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    try {
      await verifyIdToken(req);
      const token = earthdataToken.value();
      if (!isTokenReal(token)) {
        return jsonRes(res, 200, {
          ok: false,
          reason: "token_placeholder",
          message: "Set EARTHDATA_TOKEN in Firebase Secrets to enable satellite search.",
        });
      }

      const params = new URLSearchParams({
        short_name: String(req.query.short_name || "SPL3SMP_E"),
        bounding_box: String(req.query.bounding_box || "77.5,12.9,77.7,13.1"),
        temporal: String(req.query.temporal || "2024-01-01T00:00:00Z,2024-01-07T23:59:59Z"),
        page_size: String(req.query.page_size || "5"),
      });

      const response = await fetch(
        `https://cmr.earthdata.nasa.gov/search/granules.json?${params}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { body = { raw: text }; }
      jsonRes(res, response.status, { ok: response.ok, status: response.status, result: body });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      jsonRes(res, 500, { error: err.message });
    }
  }
);
