/**
 * Tomorrow.io Weather API — full field set for farmers.
 * Docs: https://docs.tomorrow.io/reference/weather-data-layers
 */

const FORECAST_URL = "https://api.tomorrow.io/v4/weather/forecast";
const REALTIME_URL = "https://api.tomorrow.io/v4/weather/realtime";
const TIMELINES_URL = "https://api.tomorrow.io/v4/timelines";

/** Core layers available on typical free/starter plans */
const CORE_FIELDS = [
  "temperature",
  "temperatureApparent",
  "dewPoint",
  "humidity",
  "windSpeed",
  "windDirection",
  "windGust",
  "pressureSurfaceLevel",
  "pressureSeaLevel",
  "precipitationIntensity",
  "precipitationProbability",
  "precipitationType",
  "rainIntensity",
  "freezingRainIntensity",
  "snowIntensity",
  "sleetIntensity",
  "rainAccumulation",
  "snowAccumulation",
  "snowAccumulationLwe",
  "snowDepth",
  "sleetAccumulation",
  "sleetAccumulationLwe",
  "iceAccumulation",
  "iceAccumulationLwe",
  "visibility",
  "cloudCover",
  "cloudBase",
  "cloudCeiling",
  "uvIndex",
  "uvHealthConcern",
  "weatherCode",
  "weatherCodeFullDay",
  "weatherCodeDay",
  "weatherCodeNight",
  "thunderstormProbability",
  "sunriseTime",
  "sunsetTime",
  "moonPhase",
];

/** Agriculture / extended layers (may require paid plan — tried, then dropped on 400) */
const AG_FIELDS = [
  "evapotranspiration",
  "ezHeatStressIndex",
  "gdd10To30",
  "gdd10To31",
  "gdd08To30",
  "gdd03To25",
];

const ALL_FIELDS = [...CORE_FIELDS, ...AG_FIELDS];

const WEATHER_CODE_LABELS = {
  0: "Unknown",
  1000: "Clear",
  1100: "Mostly clear",
  1101: "Partly cloudy",
  1102: "Mostly cloudy",
  1001: "Cloudy",
  2000: "Fog",
  2100: "Light fog",
  4000: "Drizzle",
  4001: "Rain",
  4200: "Light rain",
  4201: "Heavy rain",
  5000: "Snow",
  5001: "Flurries",
  5100: "Light snow",
  5101: "Heavy snow",
  6000: "Freezing drizzle",
  6001: "Freezing rain",
  6200: "Light freezing rain",
  6201: "Heavy freezing rain",
  7000: "Ice pellets",
  7101: "Heavy ice pellets",
  7102: "Light ice pellets",
  8000: "Thunderstorm",
};

const PRECIP_TYPE = {
  0: "None",
  1: "Rain",
  2: "Snow",
  3: "Freezing rain",
  4: "Ice pellets / sleet",
};

const MOON_PHASE = {
  0: "New",
  1: "Waxing crescent",
  2: "First quarter",
  3: "Waxing gibbous",
  4: "Full",
  5: "Waning gibbous",
  6: "Third quarter",
  7: "Waning crescent",
};

const UV_LABELS = {
  0: "Low",
  1: "Low",
  2: "Low",
  3: "Moderate",
  4: "Moderate",
  5: "Moderate",
  6: "High",
  7: "High",
  8: "Very high",
  9: "Very high",
  10: "Very high",
};

function weatherLabel(code) {
  const n = Number(code);
  return WEATHER_CODE_LABELS[n] || (code == null ? "—" : `Code ${code}`);
}

function precipTypeLabel(t) {
  const n = Number(t);
  return PRECIP_TYPE[n] || (t == null ? "—" : String(t));
}

function moonLabel(p) {
  const n = Number(p);
  return MOON_PHASE[n] || (p == null ? "—" : String(p));
}

function uvLabel(idx) {
  const n = Math.round(Number(idx));
  if (!Number.isFinite(n)) return "—";
  if (n >= 11) return "Extreme";
  return UV_LABELS[n] || String(n);
}

function heatStressLabel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n < 22) return "No heat stress";
  if (n < 24) return "Mild";
  if (n < 26) return "Moderate";
  if (n < 28) return "Medium";
  if (n < 30) return "Severe";
  return "Extreme";
}

function pickValues(interval) {
  return interval?.values || {};
}

function intervalTime(interval) {
  return interval?.startTime || interval?.time || null;
}

async function parseJsonResponse(res) {
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return body;
}

/**
 * Timelines POST — explicit fields for full farmer coverage.
 */
async function fetchTimelines(apiKey, lat, lon, fields, { units = "metric", timesteps = ["current", "1h", "1d"] } = {}) {
  const res = await fetch(`${TIMELINES_URL}?apikey=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      location: `${lat},${lon}`,
      fields,
      timesteps,
      units,
      timezone: "auto",
    }),
  });
  const body = await parseJsonResponse(res);
  if (!res.ok) {
    const err = new Error(body?.message || body?.type || `Tomorrow.io timelines ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function fetchTomorrowForecast(apiKey, lat, lon, units = "metric") {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set("timesteps", "1h,1d");
  url.searchParams.set("units", units);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const body = await parseJsonResponse(res);
  if (!res.ok) {
    const err = new Error(body?.message || body?.type || `Tomorrow.io forecast ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function fetchTomorrowRealtime(apiKey, lat, lon, units = "metric") {
  const url = new URL(REALTIME_URL);
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set("units", units);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const body = await parseJsonResponse(res);
  if (!res.ok) {
    return { ok: false, status: res.status, error: body?.message || body?.type || `realtime ${res.status}` };
  }
  return { ok: true, data: body };
}

/** Flatten any Tomorrow values object into a farmer-facing record. */
function normalizeValues(v = {}, { time = null } = {}) {
  const weatherCode = v.weatherCode ?? v.weatherCodeFullDay ?? v.weatherCodeDay ?? null;
  return {
    time,
    // Temperature & moisture
    temperature: v.temperature ?? null,
    temperatureApparent: v.temperatureApparent ?? null,
    dewPoint: v.dewPoint ?? null,
    humidity: v.humidity ?? null,
    // Wind
    windSpeed: v.windSpeed ?? null,
    windDirection: v.windDirection ?? null,
    windGust: v.windGust ?? null,
    // Pressure
    pressureSurfaceLevel: v.pressureSurfaceLevel ?? null,
    pressureSeaLevel: v.pressureSeaLevel ?? null,
    // Precipitation
    precipitationIntensity: v.precipitationIntensity ?? null,
    rainIntensity: v.rainIntensity ?? null,
    freezingRainIntensity: v.freezingRainIntensity ?? null,
    snowIntensity: v.snowIntensity ?? null,
    sleetIntensity: v.sleetIntensity ?? null,
    precipitationProbability: v.precipitationProbability ?? null,
    precipitationType: v.precipitationType ?? null,
    precipitationTypeLabel: precipTypeLabel(v.precipitationType),
    rainAccumulation: v.rainAccumulation ?? null,
    snowAccumulation: v.snowAccumulation ?? null,
    snowAccumulationLwe: v.snowAccumulationLwe ?? null,
    snowDepth: v.snowDepth ?? null,
    sleetAccumulation: v.sleetAccumulation ?? null,
    sleetAccumulationLwe: v.sleetAccumulationLwe ?? null,
    iceAccumulation: v.iceAccumulation ?? null,
    iceAccumulationLwe: v.iceAccumulationLwe ?? null,
    // Sky / light
    visibility: v.visibility ?? null,
    cloudCover: v.cloudCover ?? null,
    cloudBase: v.cloudBase ?? null,
    cloudCeiling: v.cloudCeiling ?? null,
    uvIndex: v.uvIndex ?? null,
    uvLabel: uvLabel(v.uvIndex),
    uvHealthConcern: v.uvHealthConcern ?? null,
    uvHealthLabel: uvLabel(v.uvHealthConcern ?? v.uvIndex),
    // Codes / sun / moon
    weatherCode,
    weather: weatherLabel(weatherCode),
    weatherCodeFullDay: v.weatherCodeFullDay ?? null,
    weatherCodeDay: v.weatherCodeDay ?? null,
    weatherCodeNight: v.weatherCodeNight ?? null,
    weatherFullDay: weatherLabel(v.weatherCodeFullDay),
    weatherDay: weatherLabel(v.weatherCodeDay),
    weatherNight: weatherLabel(v.weatherCodeNight),
    sunriseTime: v.sunriseTime ?? null,
    sunsetTime: v.sunsetTime ?? null,
    moonPhase: v.moonPhase ?? null,
    moonPhaseLabel: moonLabel(v.moonPhase),
    thunderstormProbability: v.thunderstormProbability ?? null,
    // Agriculture
    evapotranspiration: v.evapotranspiration ?? null,
    ezHeatStressIndex: v.ezHeatStressIndex ?? null,
    heatStressLabel: heatStressLabel(v.ezHeatStressIndex),
    gdd10To30: v.gdd10To30 ?? null,
    gdd10To31: v.gdd10To31 ?? null,
    gdd08To30: v.gdd08To30 ?? null,
    gdd03To25: v.gdd03To25 ?? null,
    // Daily aggregates (when present)
    temperatureAvg: v.temperatureAvg ?? null,
    temperatureMax: v.temperatureMax ?? null,
    temperatureMin: v.temperatureMin ?? null,
    humidityAvg: v.humidityAvg ?? null,
    windSpeedAvg: v.windSpeedAvg ?? null,
    windGustMax: v.windGustMax ?? null,
    precipitationIntensityAvg: v.precipitationIntensityAvg ?? null,
    precipitationProbabilityAvg: v.precipitationProbabilityAvg ?? null,
    rainAccumulationSum: v.rainAccumulationSum ?? v.rainAccumulation ?? null,
    uvIndexMax: v.uvIndexMax ?? null,
    evapotranspirationSum: v.evapotranspirationSum ?? v.evapotranspiration ?? null,
  };
}

function timelinesByStep(data) {
  const timelines = data?.data?.timelines || data?.timelines || [];
  const by = { current: [], hourly: [], daily: [] };
  // Array form (POST timelines)
  if (Array.isArray(timelines)) {
    timelines.forEach((tl) => {
      const step = tl.timestep;
      const intervals = tl.intervals || [];
      if (step === "current") by.current = intervals;
      else if (step === "1h") by.hourly = intervals;
      else if (step === "1d") by.daily = intervals;
    });
    return by;
  }
  // Object form (GET forecast)
  by.hourly = timelines.hourly || [];
  by.daily = timelines.daily || [];
  by.current = timelines.current ? [timelines.current].flat() : [];
  return by;
}

function normalizeHourly(intervals) {
  return (intervals || []).slice(0, 48).map((h) => normalizeValues(pickValues(h), { time: intervalTime(h) }));
}

function normalizeDaily(intervals) {
  return (intervals || []).slice(0, 14).map((d) => {
    const v = pickValues(d);
    const row = normalizeValues(v, { time: intervalTime(d) });
    // Prefer daily aggregates when present
    if (v.temperatureMax != null) row.temperatureMax = v.temperatureMax;
    if (v.temperatureMin != null) row.temperatureMin = v.temperatureMin;
    if (v.temperatureAvg != null) row.temperature = v.temperatureAvg;
    if (v.humidityAvg != null) row.humidity = v.humidityAvg;
    if (v.windSpeedAvg != null) row.windSpeed = v.windSpeedAvg;
    if (v.precipitationProbabilityAvg != null) row.precipitationProbability = v.precipitationProbabilityAvg;
    if (v.rainAccumulationSum != null) row.rainAccumulation = v.rainAccumulationSum;
    if (v.evapotranspirationSum != null) row.evapotranspiration = v.evapotranspirationSum;
    if (v.uvIndexMax != null) {
      row.uvIndex = v.uvIndexMax;
      row.uvLabel = uvLabel(v.uvIndexMax);
    }
    return row;
  });
}

function normalizeCurrent(realtimeBody, fallbackHourly) {
  if (realtimeBody?.ok) {
    const data = realtimeBody.data?.data || realtimeBody.data;
    return normalizeValues(data?.values || {}, { time: data?.time || null });
  }
  return fallbackHourly || null;
}

function buildFarmAdvisories(hourly = [], daily = [], current = null) {
  const now = Date.now();
  const next24 = hourly.filter((h) => {
    const t = Date.parse(h.time || "");
    return Number.isFinite(t) && t >= now - 3600000 && t <= now + 24 * 3600000;
  });
  const sample = next24.length ? next24 : hourly.slice(0, 24);

  const sprayWindows = [];
  for (const h of sample) {
    const wind = Number(h.windSpeed);
    const gust = Number(h.windGust);
    const rainP = Number(h.precipitationProbability);
    const rainI = Number(h.precipitationIntensity ?? h.rainIntensity);
    const humid = Number(h.humidity);
    const windOk = Number.isFinite(wind) && wind <= 4.5 && (!Number.isFinite(gust) || gust <= 7);
    const dryOk = (!Number.isFinite(rainP) || rainP < 30) && (!Number.isFinite(rainI) || rainI < 0.1);
    const humidOk = !Number.isFinite(humid) || (humid >= 35 && humid <= 85);
    if (windOk && dryOk && humidOk) {
      sprayWindows.push({
        time: h.time,
        windSpeed: wind,
        humidity: humid,
        precipitationProbability: rainP,
        note: "Favorable spray window",
      });
    }
  }

  const frostHours = sample.filter((h) => Number(h.temperature) <= 2);
  const heatHours = sample.filter(
    (h) => Number(h.temperature) >= 36 || Number(h.ezHeatStressIndex) >= 26
  );
  const heavyRainHours = sample.filter(
    (h) =>
      Number(h.precipitationProbability) >= 60 ||
      Number(h.precipitationIntensity ?? h.rainIntensity) >= 2
  );
  const stormHours = sample.filter((h) => Number(h.thunderstormProbability) >= 40);
  const highUv = sample.filter((h) => Number(h.uvIndex) >= 8);

  const advisories = [];
  if (sprayWindows.length) {
    advisories.push({
      id: "spray",
      level: "ok",
      title: "Spray windows available",
      summary: `${sprayWindows.length} hour(s) look suitable for spraying (low wind, low rain chance).`,
      windows: sprayWindows.slice(0, 6),
    });
  } else {
    advisories.push({
      id: "spray",
      level: "watch",
      title: "Limited spray windows",
      summary: "Wind, rain chance, or humidity may limit safe spraying in the next 24 hours.",
      windows: [],
    });
  }
  if (frostHours.length) {
    advisories.push({
      id: "frost",
      level: "action",
      title: "Frost / chill risk",
      summary: `${frostHours.length} hour(s) ≤ 2°C — protect sensitive crops.`,
      times: frostHours.slice(0, 4).map((h) => h.time),
    });
  }
  if (heatHours.length || (current && Number(current.ezHeatStressIndex) >= 26)) {
    advisories.push({
      id: "heat",
      level: "action",
      title: "Heat stress risk",
      summary: current?.heatStressLabel
        ? `Heat stress index: ${current.ezHeatStressIndex} (${current.heatStressLabel}). Plan irrigation and worker breaks.`
        : `${heatHours.length} hot hour(s) ahead — consider irrigation timing.`,
      times: heatHours.slice(0, 4).map((h) => h.time),
    });
  }
  if (heavyRainHours.length) {
    advisories.push({
      id: "rain",
      level: "watch",
      title: "Heavy rain chance",
      summary: `${heavyRainHours.length} hour(s) with elevated rain — delay fertilizer top-dress if possible.`,
      times: heavyRainHours.slice(0, 4).map((h) => h.time),
    });
  }
  if (stormHours.length) {
    advisories.push({
      id: "storm",
      level: "action",
      title: "Thunderstorm probability",
      summary: `${stormHours.length} hour(s) with elevated thunderstorm probability.`,
      times: stormHours.slice(0, 4).map((h) => h.time),
    });
  }
  if (highUv.length) {
    advisories.push({
      id: "uv",
      level: "watch",
      title: "High UV",
      summary: `${highUv.length} hour(s) with UV index ≥ 8 — protect workers outdoors.`,
      times: highUv.slice(0, 4).map((h) => h.time),
    });
  }

  const etSum = daily
    .slice(0, 3)
    .reduce((a, d) => a + (Number(d.evapotranspiration) || 0), 0);
  if (etSum > 0) {
    advisories.push({
      id: "et",
      level: "ok",
      title: "Evapotranspiration outlook",
      summary: `~${etSum.toFixed(1)} mm ET over the next ${Math.min(3, daily.length)} day(s) (Penman–Monteith). Use with irrigation planning.`,
    });
  }

  return advisories;
}

function fieldCatalog() {
  return ALL_FIELDS.map((id) => ({
    id,
    group: AG_FIELDS.includes(id) ? "agriculture" : "core",
  }));
}

/**
 * Prefer Timelines with full fields; fall back to core, then forecast endpoint.
 */
async function buildTomorrowFieldWeather(apiKey, lat, lon, { units = "metric" } = {}) {
  let timelineData = null;
  let fieldsUsed = ALL_FIELDS;
  let fieldNote = null;

  try {
    timelineData = await fetchTimelines(apiKey, lat, lon, ALL_FIELDS, { units });
  } catch (err) {
    // Plan may not include ag layers — retry core only
    try {
      timelineData = await fetchTimelines(apiKey, lat, lon, CORE_FIELDS, { units });
      fieldsUsed = CORE_FIELDS;
      fieldNote = "Agriculture layers (GDD / ET / heat stress) unavailable on this API plan — core weather loaded.";
    } catch (err2) {
      // Last resort: simple forecast endpoint
      const forecast = await fetchTomorrowForecast(apiKey, lat, lon, units);
      timelineData = { timelines: forecast.timelines, location: forecast.location };
      fieldsUsed = CORE_FIELDS;
      fieldNote = "Loaded via forecast endpoint (subset of layers).";
    }
  }

  const by = timelinesByStep(timelineData);
  const hourly = normalizeHourly(by.hourly);
  const daily = normalizeDaily(by.daily);
  const currentFromTl = by.current?.[0]
    ? normalizeValues(pickValues(by.current[0]), { time: intervalTime(by.current[0]) })
    : null;

  const realtime = await fetchTomorrowRealtime(apiKey, lat, lon, units);
  const current = normalizeCurrent(realtime, currentFromTl || hourly[0] || null);
  const advisories = buildFarmAdvisories(hourly, daily, current);

  return {
    ok: true,
    provider: "tomorrow.io",
    modelVersion: "tomorrow_field_v2_full",
    generatedAt: new Date().toISOString(),
    units,
    location: timelineData?.data?.location || timelineData?.location || { lat, lon },
    current,
    hourly,
    daily,
    advisories,
    fieldsRequested: fieldsUsed,
    fieldCatalog: fieldCatalog(),
    fieldNote,
    provenance: {
      sources: [
        "Tomorrow.io /v4/timelines",
        realtime?.ok ? "weather/realtime" : "current/hourly fallback",
      ],
      realtimeOk: Boolean(realtime?.ok),
      realtimeError: realtime?.ok ? null : realtime?.error || null,
      fieldsCount: fieldsUsed.length,
    },
  };
}

module.exports = {
  buildTomorrowFieldWeather,
  fetchTomorrowForecast,
  fetchTomorrowRealtime,
  fetchTimelines,
  buildFarmAdvisories,
  weatherLabel,
  ALL_FIELDS,
  CORE_FIELDS,
  AG_FIELDS,
};
