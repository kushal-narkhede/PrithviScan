"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { analyzePowerBundle } = require("./lib/trends");
const { classifyLatLon } = require("./lib/vision");
const { runAiChat } = require("./lib/ai-chat");
const { buildUrtcSuite, snapBoundary } = require("./lib/urtc-models");

setGlobalOptions({ region: "us-central1", invoker: "public" });

if (!getApps().length) initializeApp();

const earthdataToken = defineSecret("EARTHDATA_TOKEN");
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const openrouterApiKey = defineSecret("OPENROUTER_API_KEY");

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
  { secrets: [earthdataToken], cors: true, invoker: "public" },
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

      // Ensemble-ready normalization (3.2) — POWER today; GPM/ECMWF stubs later
      const { fetchWeatherEnsemble } = require("./lib/data-layer");
      const weatherBundle = await fetchWeatherEnsemble({
        lat: Number(lat),
        lon: Number(lon),
        days,
        powerParameter: power,
      });
      const metrics = weatherBundle.normalized || {
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

      // ---- Fusion rules (2.2 provenance + 3.4 explainable rule traces) ----
      const factors = [];
      const evidence = [];
      const ruleTraces = [];
      let level = "info";
      let titleKey = "conditions_ok";
      let confidence = 0.55;

      // Sensitivity multiplier from client (0.7 = stricter, 1.3 = more sensitive)
      const sensitivity = Math.min(1.5, Math.max(0.6, Number(req.query.sensitivity) || 1));

      const rain = metrics.totalRain_mm;
      const et = metrics.totalET_mm;
      const temp = metrics.avgTemp_c;
      const maxTemp = metrics.maxTemp_c;
      const humidity = metrics.avgHumidity_pct;

      if (rain !== null) {
        evidence.push({
          source: "NASA POWER",
          metric: "PRECTOTCORR",
          label: "7-day rainfall",
          value: Number(rain.toFixed(2)),
          unit: "mm",
          weight: 0.35,
        });
      }
      if (et !== null) {
        evidence.push({
          source: "NASA POWER",
          metric: "EVPTRNS",
          label: "7-day ET demand",
          value: Number(et.toFixed(2)),
          unit: "mm",
          weight: 0.3,
        });
      }
      if (maxTemp !== null) {
        evidence.push({
          source: "NASA POWER",
          metric: "T2M_MAX",
          label: "Avg daily max temp",
          value: Number(maxTemp.toFixed(2)),
          unit: "°C",
          weight: 0.2,
        });
      }
      if (humidity !== null) {
        evidence.push({
          source: "NASA POWER",
          metric: "RH2M",
          label: "Avg humidity",
          value: Number(humidity.toFixed(1)),
          unit: "%",
          weight: 0.15,
        });
      }

      const thr = {
        irrigateRain: 5 * sensitivity,
        irrigateET: 10 / sensitivity,
        moistureRain: 12 * sensitivity,
        moistureET: 8 / sensitivity,
        heatMax: 37 / sensitivity,
        excessRain: 60 / sensitivity,
        diseaseHumidity: 85 / sensitivity,
        diseaseTemp: 28 / sensitivity,
      };

      // Rule 1: Irrigation needed
      if (rain !== null && et !== null && rain < thr.irrigateRain && et > thr.irrigateET) {
        level = "action";
        titleKey = "irrigate_soon";
        confidence = 0.88;
        const reason = `Only ${rain?.toFixed(1)} mm rain in 7 days vs ${et?.toFixed(1)} mm ET demand`;
        factors.push(reason);
        ruleTraces.push({
          id: "R1_irrigate_soon",
          fired: true,
          level: "action",
          condition: `rain < ${thr.irrigateRain.toFixed(1)} mm AND et > ${thr.irrigateET.toFixed(1)} mm`,
          inputs: { rain_mm: rain, et_mm: et },
          reason,
        });
      } else if (rain !== null && et !== null && rain < thr.moistureRain && et > thr.moistureET) {
        level = "watch";
        titleKey = "low_moisture";
        confidence = 0.74;
        const reason = `Low rainfall (${rain?.toFixed(1)} mm) relative to ET demand`;
        factors.push(reason);
        ruleTraces.push({
          id: "R1b_low_moisture",
          fired: true,
          level: "watch",
          condition: `rain < ${thr.moistureRain.toFixed(1)} mm AND et > ${thr.moistureET.toFixed(1)} mm`,
          inputs: { rain_mm: rain, et_mm: et },
          reason,
        });
      } else {
        ruleTraces.push({
          id: "R1_irrigate_soon",
          fired: false,
          level: "action",
          condition: `rain < ${thr.irrigateRain.toFixed(1)} mm AND et > ${thr.irrigateET.toFixed(1)} mm`,
          inputs: { rain_mm: rain, et_mm: et },
          reason: "Irrigation urgency thresholds not met",
        });
      }

      // Rule 2: Heat stress
      if (maxTemp !== null && maxTemp > thr.heatMax) {
        level = level === "action" ? "action" : "watch";
        titleKey = titleKey === "irrigate_soon" ? "irrigate_soon" : "heat_stress";
        confidence = Math.max(confidence, 0.82);
        const reason = `Max temperature ${maxTemp?.toFixed(1)}°C exceeds heat stress threshold`;
        factors.push(reason);
        ruleTraces.push({
          id: "R2_heat_stress",
          fired: true,
          level: "watch",
          condition: `maxTemp > ${thr.heatMax.toFixed(1)} °C`,
          inputs: { maxTemp_c: maxTemp },
          reason,
        });
      } else {
        ruleTraces.push({
          id: "R2_heat_stress",
          fired: false,
          level: "watch",
          condition: `maxTemp > ${thr.heatMax.toFixed(1)} °C`,
          inputs: { maxTemp_c: maxTemp },
          reason: "Heat threshold not exceeded",
        });
      }

      // Rule 3: Heavy rainfall risk
      if (rain !== null && rain > thr.excessRain) {
        level = level === "action" ? "action" : "watch";
        titleKey = "excess_rain";
        confidence = Math.max(confidence, 0.8);
        const reason = `Heavy rainfall: ${rain?.toFixed(1)} mm in 7 days — watch for waterlogging`;
        factors.push(reason);
        ruleTraces.push({
          id: "R3_excess_rain",
          fired: true,
          level: "watch",
          condition: `rain > ${thr.excessRain.toFixed(1)} mm`,
          inputs: { rain_mm: rain },
          reason,
        });
      } else {
        ruleTraces.push({
          id: "R3_excess_rain",
          fired: false,
          level: "watch",
          condition: `rain > ${thr.excessRain.toFixed(1)} mm`,
          inputs: { rain_mm: rain },
          reason: "Rainfall below excess threshold",
        });
      }

      // Rule 4: High humidity disease risk
      if (humidity !== null && humidity > thr.diseaseHumidity && maxTemp !== null && maxTemp > thr.diseaseTemp) {
        if (level === "info") { level = "watch"; titleKey = "disease_risk"; }
        confidence = Math.max(confidence, 0.7);
        const reason = `High humidity (${humidity?.toFixed(0)}%) + warm temps increase disease risk`;
        factors.push(reason);
        ruleTraces.push({
          id: "R4_disease_risk",
          fired: true,
          level: "watch",
          condition: `humidity > ${thr.diseaseHumidity.toFixed(0)}% AND maxTemp > ${thr.diseaseTemp.toFixed(1)}°C`,
          inputs: { humidity_pct: humidity, maxTemp_c: maxTemp },
          reason,
        });
      } else {
        ruleTraces.push({
          id: "R4_disease_risk",
          fired: false,
          level: "watch",
          condition: `humidity > ${thr.diseaseHumidity.toFixed(0)}% AND maxTemp > ${thr.diseaseTemp.toFixed(1)}°C`,
          inputs: { humidity_pct: humidity, maxTemp_c: maxTemp },
          reason: "Disease risk thresholds not met",
        });
      }

      // Rule 5: Good conditions
      if (factors.length === 0) {
        factors.push("Rainfall, temperature and ET are within normal range");
        confidence = 0.68;
        ruleTraces.push({
          id: "R5_conditions_ok",
          fired: true,
          level: "info",
          condition: "no stress rules fired",
          inputs: { rain_mm: rain, et_mm: et, maxTemp_c: maxTemp, humidity_pct: humidity },
          reason: "All stress rules quiet — conditions look good",
        });
      }

      // Satellite availability nudges confidence slightly
      if (earthFlags.smapAvailable || earthFlags.modisAvailable) {
        confidence = Math.min(0.95, confidence + 0.04);
      }
      // Fewer usable POWER metrics → lower confidence
      const metricCount = [rain, et, maxTemp, humidity].filter((v) => v !== null).length;
      if (metricCount < 3) confidence = Math.max(0.35, confidence - 0.15);

      const TITLES = {
        irrigate_soon: "Irrigate tomorrow",
        low_moisture: "Moisture deficit — monitor closely",
        heat_stress: "High temperature stress detected",
        excess_rain: "Excess rainfall — check drainage",
        disease_risk: "Disease risk elevated",
        conditions_ok: "Field conditions look good",
      };

      const ACTIONS = {
        irrigate_soon: "Schedule irrigation within 24 hours",
        low_moisture: "Scout soil moisture and plan light irrigation",
        heat_stress: "Apply cooling irrigation / reduce midday stress",
        excess_rain: "Clear drainage channels and scout for waterlogging",
        disease_risk: "Scout leaves for disease; consider preventive spray",
        conditions_ok: "No action required — continue routine monitoring",
      };

      const MESSAGES = {
        irrigate_soon: "Rainfall deficit detected. Plan irrigation within 24 hours to avoid crop stress.",
        low_moisture: "Below-average rainfall with above-average ET. Consider light irrigation and monitor soil.",
        heat_stress: "Temperatures are above the stress threshold. Consider cooling irrigation and shade if possible.",
        excess_rain: "Rainfall is high this week. Ensure drainage is clear and watch for fungal disease.",
        disease_risk: "Warm, humid conditions favour fungal pathogens. Scout your crop and consider preventive measures.",
        conditions_ok: "No immediate action required. Continue monitoring as conditions can change quickly.",
      };

      const why =
        `We recommend “${ACTIONS[titleKey]}” because: ${factors.join("; ")}. ` +
        `Based on the last ${days} days of NASA POWER weather` +
        (earthFlags.smapAvailable || earthFlags.modisAvailable
          ? " plus nearby Earthdata satellite granule availability."
          : ".");

      const sources = ["NASA POWER"];
      if (earthFlags.smapAvailable) sources.push("NASA SMAP (Earthdata CMR)");
      if (earthFlags.modisAvailable) sources.push("NASA MODIS MOD13Q1 (Earthdata CMR)");

      const generatedAt = new Date().toISOString();
      const insight = {
        level,
        title: TITLES[titleKey] || TITLES.conditions_ok,
        action: ACTIONS[titleKey] || ACTIONS.conditions_ok,
        message: MESSAGES[titleKey] || MESSAGES.conditions_ok,
        why,
        factors,
        evidence,
        ruleTraces,
        sensitivity,
        confidence: Number(confidence.toFixed(2)),
        provenance: {
          sources,
          model: "rule_fusion_v1",
          windowDays: days,
          generatedAt,
          lat: Number(lat),
          lon: Number(lon),
          earthFlags,
          sensitivity,
          weatherProviders: (weatherBundle.sources || []).map((s) => ({
            provider: s.provider,
            available: s.available,
            reason: s.reason || null,
          })),
        },
        metrics,
        earthFlags,
        generatedAt,
      };

      // Persist to Firestore (personal or org field)
      const db = getFirestore();
      const orgId = req.query.orgId ? String(req.query.orgId) : null;
      const fieldRef = orgId
        ? db.collection("organizations").doc(orgId).collection("fields").doc(String(fieldId))
        : db.collection("users").doc(decoded.uid).collection("fields").doc(String(fieldId));

      await fieldRef.collection("insights").doc("latest").set({
        ...insight,
        savedAt: FieldValue.serverTimestamp(),
      });

      const alertDoc = {
        fieldId: String(fieldId),
        orgId: orgId || null,
        level,
        title: insight.title,
        message: insight.message,
        factors: insight.factors,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      };

      // Write alert if action/watch — fan out to org members when org field
      if (level === "action" || level === "watch") {
        const recipientUids = new Set([decoded.uid]);
        if (orgId) {
          const orgSnap = await db.collection("organizations").doc(orgId).get();
          (orgSnap.data()?.memberIds || []).forEach((u) => recipientUids.add(u));
        }
        for (const uid of recipientUids) {
          const alertRef = await db.collection("users").doc(uid).collection("alerts").add(alertDoc);
          // Queue outbound delivery (email / SMS / WhatsApp / push)
          await db.collection("users").doc(uid).collection("alertOutbox").add({
            alertId: alertRef.id,
            ...alertDoc,
            channelsPending: ["email", "push", "sms", "whatsapp"],
            status: "queued",
            queuedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Update field's last insight summary
      await fieldRef.update({
        lastInsight: {
          level,
          title: insight.title,
          action: insight.action,
          confidence: insight.confidence,
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

// ---------- Function: fieldSatelliteArchive (MODIS / SMAP / HLS browse + history) ----------
const SAT_PRODUCTS = {
  modis_terra: {
    shortName: "MOD13Q1",
    label: "MODIS Terra VI (MOD13Q1)",
    description: "16-day vegetation index — greening / stress over time",
  },
  modis_aqua: {
    shortName: "MYD13Q1",
    label: "MODIS Aqua VI (MYD13Q1)",
    description: "Aqua twin of MOD13Q1 for denser vegetation history",
  },
  smap: {
    shortName: "SPL3SMP_E",
    label: "SMAP soil moisture",
    description: "Surface soil moisture granules near your field",
  },
  hls: {
    shortName: "HLSS30",
    label: "HLS (Sentinel-2)",
    description: "Higher-resolution harmonized surface reflectance",
  },
  landsat: {
    shortName: "HLSL30",
    label: "HLS (Landsat)",
    description: "Landsat-harmonized surface reflectance for crop structure",
  },
  sar: {
    shortName: "SENTINEL-1_DUAL_POL_GRD_HIGH_RES",
    label: "Sentinel-1 SAR GRD",
    description: "C-band SAR — cloudy-region moisture / structure proxy",
  },
};

function pickBrowseUrl(entry) {
  const links = entry?.links || [];
  const browse = links.find(
    (l) =>
      typeof l.rel === "string" &&
      (l.rel.includes("browse") || l.rel.includes("thumbnail") || l.rel.includes("browse#"))
  );
  if (browse?.href) return browse.href;
  const img = links.find((l) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(l.href || ""));
  return img?.href || null;
}

function pickDataUrl(entry) {
  const links = entry?.links || [];
  const data = links.find(
    (l) => typeof l.rel === "string" && (l.rel.includes("/data#") || l.rel.endsWith("/data"))
  );
  return data?.href || null;
}

exports.fieldSatelliteArchive = onRequest(
  { secrets: [earthdataToken], cors: true, timeoutSeconds: 120, invoker: "public" },
  async (req, res) => {
    try {
      await verifyIdToken(req);
      const token = earthdataToken.value();
      if (!isTokenReal(token)) {
        return jsonRes(res, 200, {
          ok: false,
          reason: "token_placeholder",
          message: "Earthdata token required for satellite archive.",
        });
      }

      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const days = Math.min(365, Math.max(14, Number(req.query.days) || 90));
      const productKey = String(req.query.product || "modis_terra");
      const product = SAT_PRODUCTS[productKey] || SAT_PRODUCTS.modis_terra;

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonRes(res, 400, { error: "lat and lon required" });
      }

      const margin = 0.15;
      const bbox = `${lon - margin},${lat - margin},${lon + margin},${lat + margin}`;
      const end = new Date();
      const start = new Date(end.getTime() - days * 86400000);
      const temporal = `${start.toISOString().slice(0, 10)}T00:00:00Z,${end
        .toISOString()
        .slice(0, 10)}T23:59:59Z`;

      const params = new URLSearchParams({
        short_name: product.shortName,
        bounding_box: bbox,
        temporal,
        page_size: "40",
        sort_key: "-start_date",
      });

      const r = await fetch(
        `https://cmr.earthdata.nasa.gov/search/granules.json?${params}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );

      if (!r.ok) {
        const text = await r.text();
        return jsonRes(res, 200, {
          ok: false,
          error: `CMR search failed (${r.status})`,
          detail: text.slice(0, 300),
          product: productKey,
        });
      }

      const body = await r.json();
      const entries = body?.feed?.entry || [];
      const granules = entries.map((e) => ({
        id: e.id,
        title: e.title || e.producer_granule_id || e.id,
        timeStart: e.time_start || null,
        timeEnd: e.time_end || null,
        browseUrl: pickBrowseUrl(e),
        dataUrl: pickDataUrl(e),
        cloudCover: e.cloud_cover != null ? Number(e.cloud_cover) : null,
      }));

      // Catalog availability for all products (lightweight counts)
      const catalog = {};
      await Promise.all(
        Object.entries(SAT_PRODUCTS).map(async ([key, p]) => {
          const q = new URLSearchParams({
            short_name: p.shortName,
            bounding_box: bbox,
            temporal,
            page_size: "1",
          });
          try {
            const cr = await fetch(
              `https://cmr.earthdata.nasa.gov/search/granules.json?${q}`,
              { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
            );
            const hits = cr.headers.get("cmr-hits");
            catalog[key] = {
              shortName: p.shortName,
              label: p.label,
              description: p.description,
              hits: hits != null ? Number(hits) : null,
              available: cr.ok,
            };
          } catch {
            catalog[key] = {
              shortName: p.shortName,
              label: p.label,
              description: p.description,
              hits: null,
              available: false,
            };
          }
        })
      );

      jsonRes(res, 200, {
        ok: true,
        product: productKey,
        productMeta: product,
        days,
        bbox,
        temporal,
        count: granules.length,
        granules,
        catalog,
        fetchedAt: new Date().toISOString(),
        note:
          "Browse images are NASA CMR previews. Scientific rasters (HDF/NetCDF) open via Earthdata when a data link is present.",
      });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("fieldSatelliteArchive error", err);
      jsonRes(res, 500, { ok: false, error: err.message || "Unexpected error" });
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

// ---------- Function: aiChat (Gemini / OpenRouter / optional Ollama) ----------
// Secrets: GEMINI_API_KEY, OPENROUTER_API_KEY (set via firebase functions:secrets:set)
exports.aiChat = onRequest(
  {
    secrets: [geminiApiKey, openrouterApiKey],
    cors: true,
    timeoutSeconds: 120,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return jsonRes(res, 405, { error: "POST required" });
      }
      await verifyIdToken(req);
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const gemini = geminiApiKey.value();
      const openrouter = openrouterApiKey.value();
      const result = await runAiChat(body, {
        geminiKey: isTokenReal(gemini) ? gemini : "",
        openrouterKey: isTokenReal(openrouter) ? openrouter : "",
        ollamaBaseUrl: body.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || "",
      });
      jsonRes(res, 200, { ok: true, ...result });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      jsonRes(res, err.status || 500, { ok: false, error: err.message || "AI chat failed" });
    }
  }
);

// ---------- Function: fieldHealthIndex (NDVI/EVI proxy from Esri RGB) ----------
exports.fieldHealthIndex = onRequest(
  { cors: true, timeoutSeconds: 60, invoker: "public" },
  async (req, res) => {
    try {
      await verifyIdToken(req);
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonRes(res, 400, { error: "lat and lon required" });
      }
      const result = await classifyLatLon(lat, lon);
      const features = result.features || {};
      const ndvi = Number(features.ndvi_proxy);
      const veg = Number(features.veg_fraction);
      const evi = Number.isFinite(ndvi) ? Number((ndvi * 1.15 * (1 - (features.cloud_fraction || 0))).toFixed(3)) : null;
      let code = "unknown";
      let label = "No index";
      if (Number.isFinite(ndvi)) {
        if (ndvi >= 0.35) {
          code = "good";
          label = "Healthy canopy";
        } else if (ndvi >= 0.18) {
          code = "watch";
          label = "Watch — stress rising";
        } else {
          code = "action";
          label = "Action — vegetation stress";
        }
      }
      jsonRes(res, 200, {
        ok: true,
        ndvi: Number.isFinite(ndvi) ? Number(ndvi.toFixed(3)) : null,
        evi,
        vegFraction: Number.isFinite(veg) ? Number(veg.toFixed(3)) : null,
        cloudFraction: features.cloud_fraction ?? null,
        health: { code, label },
        source: "esri_world_imagery_rgb_proxy",
        model: "ndvi_proxy_v1",
        fetchedAt: new Date().toISOString(),
        classify: {
          is_field: result.is_field,
          confidence: result.confidence,
          reason: result.reason || null,
        },
      });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("fieldHealthIndex error", err);
      jsonRes(res, 500, { ok: false, error: err.message || "Health index failed" });
    }
  }
);

// ---------- Function: processAlertOutbox (email/push/SMS/WhatsApp fan-out) ----------
exports.processAlertOutbox = onRequest(
  { cors: true, timeoutSeconds: 120, invoker: "public" },
  async (req, res) => {
    try {
      const decoded = await verifyIdToken(req);
      const db = getFirestore();
      const uid = decoded.uid;
      const userSnap = await db.collection("users").doc(uid).get();
      const prefs = userSnap.data()?.alertPrefs || {};
      const outbox = await db
        .collection("users")
        .doc(uid)
        .collection("alertOutbox")
        .where("status", "==", "queued")
        .limit(20)
        .get();

      const deliveries = [];
      for (const docSnap of outbox.docs) {
        const item = docSnap.data();
        const channels = [];
        // Quiet hours: only critical
        const hour = new Date().getHours();
        const quiet =
          prefs.quietHoursEnabled &&
          (() => {
            const start = Number(prefs.quietStart ?? 21);
            const end = Number(prefs.quietEnd ?? 7);
            if (start === end) return false;
            if (start < end) return hour >= start && hour < end;
            return hour >= start || hour < end;
          })();
        if (quiet && item.level !== "action") {
          await docSnap.ref.update({ status: "skipped_quiet", processedAt: FieldValue.serverTimestamp() });
          continue;
        }
        if (prefs.snoozedUntil && Date.now() < Number(prefs.snoozedUntil)) {
          await docSnap.ref.update({ status: "skipped_snooze", processedAt: FieldValue.serverTimestamp() });
          continue;
        }

        if (prefs.pushEnabled !== false) {
          channels.push({
            channel: "push",
            status: prefs.fcmToken ? "queued_fcm" : "stub_no_token",
            detail: prefs.fcmToken
              ? "FCM token on file — send via Admin SDK when messaging enabled"
              : "Enable notifications in the app to receive push",
          });
        }
        if (prefs.emailEnabled !== false) {
          const email = prefs.email || decoded.email || "";
          channels.push({
            channel: "email",
            status: email ? "stub_logged" : "skipped_no_email",
            detail: email
              ? `Would email ${email}: ${item.title}`
              : "Add email in alert preferences",
          });
        }
        if (prefs.smsEnabled && prefs.phoneE164) {
          channels.push({
            channel: "sms",
            status: "stub_twilio",
            detail: `Would SMS ${prefs.phoneE164}: ${item.title}`,
          });
        }
        if (prefs.whatsappEnabled && prefs.phoneE164) {
          channels.push({
            channel: "whatsapp",
            status: "stub_meta",
            detail: `Would WhatsApp ${prefs.phoneE164}: ${item.title}`,
          });
        }

        await docSnap.ref.update({
          status: "processed",
          channels,
          processedAt: FieldValue.serverTimestamp(),
        });
        deliveries.push({ id: docSnap.id, title: item.title, channels });
      }

      jsonRes(res, 200, {
        ok: true,
        processed: deliveries.length,
        deliveries,
        note: "Push/email/SMS/WhatsApp use prefs; SMS/WhatsApp require provider keys in a later harden pass.",
      });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("processAlertOutbox error", err);
      jsonRes(res, 500, { ok: false, error: err.message });
    }
  }
);

// ---------- Function: fieldUrtcSuite (Wave A/B science pack) ----------
exports.fieldUrtcSuite = onRequest(
  { cors: true, timeoutSeconds: 90 },
  async (req, res) => {
    try {
      await verifyIdToken(req);
      const lat = Number(req.query.lat ?? req.body?.lat);
      const lon = Number(req.query.lon ?? req.body?.lon);
      const fieldId = String(req.query.fieldId || req.body?.fieldId || "");
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonRes(res, 400, { error: "lat and lon required" });
      }

      const regionRaw = String(req.query.region || req.body?.region || "IN").toUpperCase();
      const region = ["IN", "US", "BR", "KE", "NG", "ID"].includes(regionRaw) ? regionRaw : "IN";
      const cropType = String(req.query.cropType || req.body?.cropType || "");
      const cropId = String(req.query.cropId || req.body?.cropId || "wheat");
      const cropStage = String(req.query.cropStage || req.body?.cropStage || "vegetative");
      const fieldHa = Math.max(0.1, Number(req.query.fieldHa || req.body?.fieldHa) || 1);
      const fertKgHa = Math.max(0, Number(req.query.fertKgHa || req.body?.fertKgHa) || 0);
      const hoursLogged = Math.max(0, Number(req.query.hoursLogged || req.body?.hoursLogged) || 0);
      const budget = Math.max(0, Number(req.query.budget || req.body?.budget) || (region === "US" ? 250 : 50000));
      const sownAt = req.query.sownAt || req.body?.sownAt || null;
      const ndvi = req.query.ndvi != null || req.body?.ndvi != null
        ? Number(req.query.ndvi ?? req.body?.ndvi)
        : null;
      const durationTypical = Number(req.query.durationTypical || req.body?.durationTypical) || 120;
      const pricePerKg = req.query.pricePerKg != null || req.body?.pricePerKg != null
        ? Number(req.query.pricePerKg ?? req.body?.pricePerKg)
        : null;

      // Prefer fresh POWER 30-day for suite inputs
      let power = null;
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
      }

      let series = null;
      let forecasts = null;
      let metrics = {
        totalRain_mm: null,
        totalET_mm: null,
        maxTemp_c: null,
        avgTemp_c: null,
        avgHumidity_pct: null,
      };

      if (power) {
        const analysis = analyzePowerBundle(power, 7);
        series = analysis.series;
        forecasts = analysis.forecasts;
        const sum = (arr) => (arr || []).reduce((a, p) => a + (Number(p.value) || 0), 0);
        const vals = (arr) => (arr || []).map((p) => Number(p.value)).filter(Number.isFinite);
        const rainArr = (series.rainfall || []).slice(-7);
        const etArr = (series.et || []).slice(-7);
        const tempArr = vals((series.temp || []).slice(-7));
        const humArr = vals((series.humidity || []).slice(-7));
        metrics = {
          totalRain_mm: Number(sum(rainArr).toFixed(1)),
          totalET_mm: Number(sum(etArr).toFixed(1)),
          maxTemp_c: tempArr.length ? Number(Math.max(...tempArr).toFixed(1)) : null,
          avgTemp_c: tempArr.length ? Number((tempArr.reduce((a, b) => a + b, 0) / tempArr.length).toFixed(1)) : null,
          avgHumidity_pct: humArr.length ? Number((humArr.reduce((a, b) => a + b, 0) / humArr.length).toFixed(1)) : null,
        };
      }

      const suite = buildUrtcSuite({
        series,
        forecasts,
        metrics,
        cropType,
        cropId,
        cropStage,
        region,
        fieldHa,
        fertKgHa,
        hoursLogged,
        budget,
        sownAt,
        ndvi: Number.isFinite(ndvi) ? ndvi : null,
        durationTypical,
        pricePerKg: Number.isFinite(pricePerKg) ? pricePerKg : null,
        practices: Array.isArray(req.body?.practices) ? req.body.practices : [],
      });

      jsonRes(res, 200, {
        ...suite,
        fieldId: fieldId || null,
        lat,
        lon,
        metrics,
      });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("fieldUrtcSuite error", err);
      jsonRes(res, 500, { error: err.message || "Unexpected error" });
    }
  }
);

// ---------- Function: snapFieldBoundary (Wave C heuristic) ----------
exports.snapFieldBoundary = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    try {
      await verifyIdToken(req);
      const body = req.method === "POST" ? req.body || {} : req.query;
      const lat = Number(body.lat);
      const lon = Number(body.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonRes(res, 400, { error: "lat and lon required" });
      }
      let polygon = body.polygon || null;
      if (typeof polygon === "string") {
        try {
          polygon = JSON.parse(polygon);
        } catch {
          polygon = null;
        }
      }
      const feature = snapBoundary(lat, lon, polygon);
      jsonRes(res, 200, { ok: true, feature });
    } catch (err) {
      if (err.status === 401) return jsonRes(res, 401, { error: "Unauthenticated" });
      console.error("snapFieldBoundary error", err);
      jsonRes(res, 500, { error: err.message || "Unexpected error" });
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
