/**
 * India localization pack — Bhuvan, Bhoonidhi, IMD, Agmarknet, soil & schemes.
 * Each provider soft-fails when its key is missing so NASA/Tomorrow still work.
 */

"use strict";

const AGMARKNET_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";

const CROP_ALIASES = {
  wheat: ["Wheat", "Wheat Flour"],
  rice: ["Rice", "Paddy(Dhan)(Common)", "Paddy(Dhan)(Basmati)"],
  paddy: ["Paddy(Dhan)(Common)", "Paddy(Dhan)(Basmati)", "Rice"],
  maize: ["Maize"],
  cotton: ["Cotton", "Kapas"],
  soybean: ["Soyabean", "Soybean"],
  mustard: ["Mustard", "Sarson"],
  gram: ["Gram", "Bengal Gram Dal (Chana Dal)", "Bengal Gram(Gram)(Whole)"],
  tur: ["Arhar (Tur/Red Gram)(Whole)", "Arhar Dal(Tur Dal)"],
  groundnut: ["Groundnut", "Ground Nut Seed"],
  onion: ["Onion"],
  potato: ["Potato"],
  tomato: ["Tomato"],
  sugarcane: ["Sugarcane"],
};

/** Rough agro-climatic / soil proxies when SHC APIs are unavailable */
const AGRO_ZONES = [
  // Plains / plateau first so Delhi–Punjab don’t match Himalaya
  { id: "lower-gangetic", name: "Lower Gangetic Plains", lat: [21.5, 27], lon: [85, 90], soils: ["Alluvial", "Deltaic"], monsoon: "SW + Bay disturbances", crops: ["Rice", "Jute", "Potato"] },
  { id: "middle-gangetic", name: "Middle Gangetic Plains", lat: [24, 28.5], lon: [80, 88], soils: ["Alluvial"], monsoon: "SW monsoon; canal + tube well", crops: ["Wheat", "Rice", "Sugarcane"] },
  { id: "upper-gangetic", name: "Upper Gangetic Plains", lat: [26, 31], lon: [75, 82], soils: ["Alluvial", "Sandy loam"], monsoon: "SW monsoon; intensive irrigation", crops: ["Wheat", "Rice", "Mustard"] },
  { id: "trans-gangetic", name: "Trans-Gangetic Plains", lat: [27.5, 32.5], lon: [73.5, 77.5], soils: ["Alluvial", "Calcareous"], monsoon: "SW monsoon; canal command", crops: ["Wheat", "Rice", "Cotton"] },
  { id: "western-himalayan", name: "Western Himalayan", lat: [30, 37], lon: [74, 80], soils: ["Alluvial", "Brown forest"], monsoon: "SW monsoon Jun–Sep; snowmelt irrigation", crops: ["Apple", "Wheat", "Maize"] },
  { id: "eastern-himalayan", name: "Eastern Himalayan", lat: [26.5, 29.5], lon: [88, 97.5], soils: ["Acidic", "Lateritic"], monsoon: "Heavy monsoon; high humidity", crops: ["Tea", "Rice", "Maize"] },
  { id: "eastern-plateau", name: "Eastern Plateau & Hills", lat: [17, 25], lon: [80, 88], soils: ["Red", "Lateritic"], monsoon: "SW monsoon; rainfed pockets", crops: ["Rice", "Pulses", "Millets"] },
  { id: "central-plateau", name: "Central Plateau & Hills", lat: [20, 27], lon: [74, 82], soils: ["Black (vertisol)", "Mixed red-black"], monsoon: "SW monsoon; drought-prone years", crops: ["Soybean", "Wheat", "Gram"] },
  { id: "western-plateau", name: "Western Plateau & Hills", lat: [15, 22], lon: [72, 78], soils: ["Black cotton", "Lateritic"], monsoon: "SW monsoon; Deccan lag", crops: ["Cotton", "Sorghum", "Pulses"] },
  { id: "southern-plateau", name: "Southern Plateau & Hills", lat: [11, 18], lon: [74, 80], soils: ["Red", "Black"], monsoon: "SW + NE monsoon (Tamil Nadu)", crops: ["Ragi", "Groundnut", "Cotton"] },
  { id: "east-coast", name: "East Coast Plains & Hills", lat: [8, 20], lon: [78, 85], soils: ["Coastal alluvial", "Deltaic"], monsoon: "SW + cyclones (Bay of Bengal)", crops: ["Rice", "Coconut", "Pulses"] },
  { id: "west-coast", name: "West Coast Plains & Ghats", lat: [8, 21], lon: [72.5, 77], soils: ["Lateritic", "Coastal"], monsoon: "Heavy SW monsoon", crops: ["Rice", "Coconut", "Spices"] },
  { id: "gujarat-plains", name: "Gujarat Plains & Hills", lat: [20, 24.7], lon: [68, 74.5], soils: ["Alluvial", "Black", "Coastal saline"], monsoon: "Erratic SW monsoon", crops: ["Cotton", "Groundnut", "Cumin"] },
  { id: "western-dry", name: "Western Dry Region", lat: [24, 30.5], lon: [69.5, 75.5], soils: ["Arid", "Sandy"], monsoon: "Low rainfall; irrigation critical", crops: ["Mustard", "Bajra", "Guar"] },
  { id: "island", name: "Island Region", lat: [6, 14], lon: [92, 94], soils: ["Coral", "Coastal"], monsoon: "Tropical monsoon", crops: ["Coconut", "Spices"] },
];

const SCHEMES = [
  { id: "pmkisan", name: "PM-KISAN", note: "₹6,000/year income support in 3 instalments — check eKYC on pmkisan.gov.in" },
  { id: "pmfby", name: "PMFBY crop insurance", note: "Notify sowing & cut-off dates with your bank / CSC before the season deadline" },
  { id: "soil-health", name: "Soil Health Card", note: "Free SHC tests via local agriculture department / CSC — upload NPK to refine our soil panel" },
  { id: "kcc", name: "Kisan Credit Card", note: "Short-term crop credit at concessional interest via banks / RRBs" },
  { id: "enam", name: "eNAM", note: "Online mandi bidding — compare with local APMC modal prices before selling" },
  { id: "pmksy", name: "PMKSY irrigation", note: "Subsidy support for micro-irrigation (drip/sprinkler) via state agri dept" },
];

const BHUVAN_WMS_LAYERS = [
  {
    id: "lulc50k",
    title: "Bhuvan LULC 50K",
    url: "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
    layers: "lulc:BR_LULC50K_0506",
    attribution: "© ISRO / NRSC Bhuvan",
  },
  {
    id: "lulc250k",
    title: "Bhuvan LULC 250K",
    url: "https://bhuvan-ras2.nrsc.gov.in/cgi-bin/LULC250K.exe",
    layers: "LULC250K",
    attribution: "© ISRO / NRSC Bhuvan",
  },
  {
    id: "was",
    title: "Bhuvan Water bodies",
    url: "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
    layers: "wh:waterbodies",
    attribution: "© ISRO / NRSC Bhuvan",
  },
];

function isReal(val, min = 12) {
  return Boolean(val && String(val).length >= min && !String(val).startsWith("PLACEHOLDER"));
}

function pickAgroZone(lat, lon) {
  for (const z of AGRO_ZONES) {
    if (lat >= z.lat[0] && lat <= z.lat[1] && lon >= z.lon[0] && lon <= z.lon[1]) return z;
  }
  return {
    id: "india-generic",
    name: "India (general)",
    soils: ["Mixed"],
    monsoon: "Follow local IMD district advisory",
    crops: ["Rice", "Wheat", "Pulses"],
  };
}

function smallAoiPolygon(lat, lon, delta = 0.08) {
  const minLon = lon - delta;
  const minLat = lat - delta;
  const maxLon = lon + delta;
  const maxLat = lat + delta;
  // WKT-ish polygon string used by Bhuvan AOI APIs
  return `${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}`;
}

async function fetchJson(url, options = {}, timeoutMs = 18000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Bhuvan sometimes wraps JSON in HTML
      const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (m) {
        try {
          json = JSON.parse(m[0]);
        } catch {
          json = null;
        }
      }
    }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(t);
  }
}

/** Village / place reverse lookup — Bhuvan reverse geocode when token set */
async function fetchBhuvanPlace(lat, lon, token) {
  const out = { configured: isReal(token), source: "bhuvan", place: null, error: null };
  if (!out.configured) {
    out.error = "BHUVAN_API_TOKEN not set";
    return out;
  }
  try {
    const url = new URL("https://bhuvan-app1.nrsc.gov.in/api/api_proximity/curl_rev_geocode.php");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("token", token);
    const { ok, json, text, status } = await fetchJson(url.toString());
    if (!ok) {
      out.error = `Bhuvan reverse geocode HTTP ${status}`;
      out.raw = text?.slice?.(0, 240) || null;
      return out;
    }
    out.place = json;
    return out;
  } catch (err) {
    out.error = err.message || "Bhuvan reverse geocode failed";
    return out;
  }
}

/** LULC 250K AOI statistics around the field */
async function fetchBhuvanLulc(lat, lon, token) {
  const out = { configured: isReal(token), source: "bhuvan-lulc250k", classes: null, error: null };
  if (!out.configured) {
    out.error = "BHUVAN_API_TOKEN not set";
    return out;
  }
  try {
    const year = "2022-23";
    const polygon = smallAoiPolygon(lat, lon, 0.05);
    const url = new URL("https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k.php");
    url.searchParams.set("polygon", polygon);
    url.searchParams.set("year", year);
    url.searchParams.set("option", "json");
    url.searchParams.set("token", token);
    const { ok, json, text, status } = await fetchJson(url.toString(), { method: "POST" });
    if (!ok && !json) {
      out.error = `Bhuvan LULC HTTP ${status}`;
      out.raw = text?.slice?.(0, 240) || null;
      return out;
    }
    out.classes = json;
    out.year = year;
    return out;
  } catch (err) {
    out.error = err.message || "Bhuvan LULC failed";
    return out;
  }
}

/** Optional place-name search (public Bhuvan search) */
async function fetchBhuvanPlacename(query) {
  const out = { source: "bhuvan-search", results: [], error: null };
  if (!query) return out;
  try {
    const url = `https://bhuvan.nrsc.gov.in/search/placename?placename=${encodeURIComponent(query)}`;
    const { ok, json, text, status } = await fetchJson(url);
    if (!ok) {
      out.error = `Bhuvan search HTTP ${status}`;
      return out;
    }
    out.results = Array.isArray(json) ? json.slice(0, 8) : json ? [json] : [];
    if (!out.results.length && text) out.raw = text.slice(0, 200);
    return out;
  } catch (err) {
    out.error = err.message || "Bhuvan search failed";
    return out;
  }
}

/**
 * Bhoonidhi STAC-ish catalog search.
 * Auth: BHOONIDHI_TOKEN (JWT) or username/password exchange when provided.
 */
async function fetchBhoonidhiScenes(lat, lon, creds = {}) {
  const token = creds.token;
  const user = creds.user;
  const pass = creds.pass;
  const out = {
    configured: isReal(token) || (isReal(user, 3) && isReal(pass, 3)),
    source: "bhoonidhi",
    scenes: [],
    error: null,
  };
  if (!out.configured) {
    out.error = "Set BHOONIDHI_TOKEN (or BHOONIDHI_USER + BHOONIDHI_PASSWORD). Request API access: bhoonidhi@nrsc.gov.in";
    return out;
  }

  try {
    let jwt = token;
    if (!isReal(jwt) && user && pass) {
      const loginUrl = "https://bhoonidhi-api.nrsc.gov.in/auth/token";
      const login = await fetchJson(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      jwt = login.json?.access_token || login.json?.token || login.json?.jwt || null;
      if (!jwt) {
        out.error = "Bhoonidhi login failed — check user/password or request API access";
        out.raw = login.text?.slice?.(0, 240) || null;
        return out;
      }
    }

    const delta = 0.15;
    const body = {
      bbox: [lon - delta, lat - delta, lon + delta, lat + delta],
      datetime: `${new Date(Date.now() - 90 * 864e5).toISOString()}/${new Date().toISOString()}`,
      limit: 12,
    };
    const search = await fetchJson(
      "https://bhoonidhi-api.nrsc.gov.in/data/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      },
      25000
    );
    if (!search.ok) {
      out.error = `Bhoonidhi search HTTP ${search.status}`;
      out.raw = search.text?.slice?.(0, 240) || null;
      return out;
    }
    const features = search.json?.features || search.json?.items || search.json?.data || [];
    out.scenes = (Array.isArray(features) ? features : []).slice(0, 12).map((f) => ({
      id: f.id || f.properties?.id || f.granuleId || "scene",
      title: f.properties?.title || f.properties?.sensor || f.collection || "ISRO / Bhoonidhi scene",
      datetime: f.properties?.datetime || f.properties?.start_datetime || null,
      collection: f.collection || f.properties?.collection || null,
      cloud: f.properties?.["eo:cloud_cover"] ?? f.properties?.cloudCover ?? null,
      browse: f.assets?.thumbnail?.href || f.assets?.overview?.href || f.browse || null,
    }));
    return out;
  } catch (err) {
    out.error = err.message || "Bhoonidhi request failed";
    return out;
  }
}

/** IMD district / city forecast + warnings when key available */
async function fetchImdPack(lat, lon, apiKey) {
  const out = {
    configured: isReal(apiKey),
    source: "imd",
    forecast: null,
    rainfall: null,
    warnings: null,
    error: null,
  };
  if (!out.configured) {
    out.error = "IMD_API_KEY not set — register at https://api.imd.gov.in";
    return out;
  }
  const headers = {
    Accept: "application/json",
    "X-API-Key": apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
  try {
    // Nearest-city style endpoint variants — IMD keys gate most routes
    const locUrl = `https://api.imd.gov.in/api/v1/cityforecastloc?lat=${lat}&lon=${lon}`;
    const loc = await fetchJson(locUrl, { headers });
    if (loc.ok && loc.json) out.forecast = loc.json;

    const rainUrl = "https://api.imd.gov.in/api/v1/districtrainfall";
    const rain = await fetchJson(rainUrl, { headers });
    if (rain.ok && rain.json) out.rainfall = rain.json;

    const warnUrl = "https://api.imd.gov.in/api/v1/districtwarning";
    const warn = await fetchJson(warnUrl, { headers });
    if (warn.ok && warn.json) out.warnings = warn.json;

    if (!out.forecast && !out.rainfall && !out.warnings) {
      out.error =
        loc.error ||
        `IMD returned no usable payload (HTTP ${loc.status}). Confirm key scopes for cityforecastloc / districtrainfall / districtwarning.`;
      out.raw = loc.text?.slice?.(0, 240) || null;
    }
    return out;
  } catch (err) {
    out.error = err.message || "IMD request failed";
    return out;
  }
}

function commodityFilters(cropType) {
  const key = String(cropType || "").toLowerCase().trim();
  if (!key) return ["Wheat", "Rice", "Onion", "Potato", "Tomato"];
  for (const [k, names] of Object.entries(CROP_ALIASES)) {
    if (key.includes(k)) return names;
  }
  return [cropType];
}

/** Live Agmarknet modal prices via data.gov.in */
async function fetchAgmarknetPrices({ apiKey, state, district, cropType, limit = 40 } = {}) {
  const out = {
    configured: isReal(apiKey),
    source: "agmarknet-data.gov.in",
    rows: [],
    error: null,
  };
  if (!out.configured) {
    out.error = "DATA_GOV_IN_API_KEY not set — free key at https://data.gov.in";
    return out;
  }
  try {
    const commodities = commodityFilters(cropType);
    const collected = [];
    for (const commodity of commodities.slice(0, 3)) {
      const url = new URL(`https://api.data.gov.in/resource/${AGMARKNET_RESOURCE}`);
      url.searchParams.set("api-key", apiKey);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", String(Math.min(limit, 40)));
      url.searchParams.set("filters[commodity]", commodity);
      if (state) url.searchParams.set("filters[state]", state);
      if (district) url.searchParams.set("filters[district]", district);
      const { ok, json, status, text } = await fetchJson(url.toString());
      if (!ok) {
        out.error = `Agmarknet HTTP ${status}`;
        out.raw = text?.slice?.(0, 200) || null;
        continue;
      }
      const records = json?.records || [];
      for (const r of records) {
        collected.push({
          commodity: r.commodity || commodity,
          state: r.state || null,
          district: r.district || null,
          market: r.market || null,
          min: numOrNull(r.min_price ?? r.minPrice),
          max: numOrNull(r.max_price ?? r.maxPrice),
          modal: numOrNull(r.modal_price ?? r.modalPrice),
          arrivalDate: r.arrival_date || r.arrivalDate || null,
          unit: "₹/quintal",
        });
      }
      if (collected.length >= 12) break;
    }
    out.rows = collected.slice(0, 24);
    if (!out.rows.length && !out.error) out.error = "No Agmarknet rows for this crop/state today";
    return out;
  } catch (err) {
    out.error = err.message || "Agmarknet request failed";
    return out;
  }
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractStateDistrict(placeJson) {
  if (!placeJson || typeof placeJson !== "object") return { state: null, district: null, village: null };
  const flat = JSON.stringify(placeJson);
  const state =
    placeJson.state ||
    placeJson.State ||
    placeJson.stname ||
    placeJson.STNAME ||
    null;
  const district =
    placeJson.district ||
    placeJson.District ||
    placeJson.dtname ||
    placeJson.DISTRICT ||
    null;
  const village =
    placeJson.village ||
    placeJson.Village ||
    placeJson.name ||
    placeJson.placename ||
    null;
  return { state, district, village, rawHint: flat.slice(0, 120) };
}

function indiaStatus(secrets = {}) {
  return {
    ok: true,
    providers: {
      bhuvan: {
        configured: isReal(secrets.bhuvanToken),
        needs: "BHUVAN_API_TOKEN",
        get: "https://bhuvan-app1.nrsc.gov.in/api/ → Access Token",
      },
      bhoonidhi: {
        configured: isReal(secrets.bhoonidhiToken) || (isReal(secrets.bhoonidhiUser, 3) && isReal(secrets.bhoonidhiPass, 3)),
        needs: "BHOONIDHI_TOKEN (preferred) or BHOONIDHI_USER + BHOONIDHI_PASSWORD",
        get: "https://bhoonidhi.nrsc.gov.in — email bhoonidhi@nrsc.gov.in for API access",
      },
      imd: {
        configured: isReal(secrets.imdKey),
        needs: "IMD_API_KEY",
        get: "https://api.imd.gov.in → Create Account",
      },
      agmarknet: {
        configured: isReal(secrets.dataGovKey),
        needs: "DATA_GOV_IN_API_KEY",
        get: "https://data.gov.in → My Account → API Keys (Agmarknet resource)",
      },
    },
    wms: BHUVAN_WMS_LAYERS,
    schemes: SCHEMES,
    note: "NASA POWER / Earthdata / Tomorrow.io remain the global stack. These India layers deepen localization when keys are set.",
  };
}

/**
 * Full India pack for one field point.
 */
async function buildIndiaFieldPack(lat, lon, secrets = {}, opts = {}) {
  const agro = pickAgroZone(lat, lon);
  const status = indiaStatus(secrets);

  const [place, lulc, bhoonidhi, imd] = await Promise.all([
    fetchBhuvanPlace(lat, lon, secrets.bhuvanToken),
    fetchBhuvanLulc(lat, lon, secrets.bhuvanToken),
    fetchBhoonidhiScenes(lat, lon, {
      token: secrets.bhoonidhiToken,
      user: secrets.bhoonidhiUser,
      pass: secrets.bhoonidhiPass,
    }),
    fetchImdPack(lat, lon, secrets.imdKey),
  ]);

  const loc = extractStateDistrict(place.place);
  const agmarknet = await fetchAgmarknetPrices({
    apiKey: secrets.dataGovKey,
    state: loc.state || opts.state || null,
    district: loc.district || opts.district || null,
    cropType: opts.cropType || null,
  });

  return {
    ok: true,
    lat,
    lon,
    region: "IN",
    providers: status.providers,
    place: {
      ...place,
      state: loc.state,
      district: loc.district,
      village: loc.village,
    },
    lulc,
    bhoonidhi,
    imd,
    agmarknet,
    soil: {
      source: "agro-climatic-proxy",
      zone: agro,
      note: "Indicative NBSS-style agro-climatic zone from lat/lon. Replace with Soil Health Card lab values when available.",
      recommendedTests: ["pH", "OC", "N", "P", "K", "Zn"],
    },
    schemes: SCHEMES,
    wms: BHUVAN_WMS_LAYERS,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildIndiaFieldPack,
  indiaStatus,
  fetchBhuvanPlace,
  fetchBhuvanLulc,
  fetchBhuvanPlacename,
  fetchBhoonidhiScenes,
  fetchImdPack,
  fetchAgmarknetPrices,
  pickAgroZone,
  BHUVAN_WMS_LAYERS,
  SCHEMES,
  AGMARKNET_RESOURCE,
};
