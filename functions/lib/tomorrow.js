/**
 * Tomorrow.io Weather API client + farm advisories.
 * Docs: https://docs.tomorrow.io/reference/weather-forecast
 */

const FORECAST_URL = "https://api.tomorrow.io/v4/weather/forecast";
const REALTIME_URL = "https://api.tomorrow.io/v4/weather/realtime";

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

function weatherLabel(code) {
  const n = Number(code);
  return WEATHER_CODE_LABELS[n] || `Code ${code ?? "—"}`;
}

function pickValues(interval) {
  return interval?.values || {};
}

/**
 * @param {string} apiKey
 * @param {number} lat
 * @param {number} lon
 * @param {"metric"|"imperial"} units
 */
async function fetchTomorrowForecast(apiKey, lat, lon, units = "metric") {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("location", `${lat},${lon}`);
  url.searchParams.set("timesteps", "1h,1d");
  url.searchParams.set("units", units);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 400) };
  }
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

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    // Realtime may be plan-limited — soft-fail
    return { ok: false, status: res.status, error: body?.message || body?.type || `realtime ${res.status}` };
  }
  return { ok: true, data: body };
}

function normalizeHourly(timelines) {
  const hourly = timelines?.hourly || [];
  return hourly.slice(0, 48).map((h) => {
    const v = pickValues(h);
    return {
      time: h.time || h.startTime || null,
      temperature: v.temperature ?? null,
      humidity: v.humidity ?? null,
      windSpeed: v.windSpeed ?? null,
      windGust: v.windGust ?? null,
      precipitationProbability: v.precipitationProbability ?? null,
      precipitationIntensity: v.precipitationIntensity ?? null,
      rainIntensity: v.rainIntensity ?? null,
      weatherCode: v.weatherCode ?? null,
      weather: weatherLabel(v.weatherCode),
      cloudCover: v.cloudCover ?? null,
      uvIndex: v.uvIndex ?? null,
      dewPoint: v.dewPoint ?? null,
    };
  });
}

function normalizeDaily(timelines) {
  const daily = timelines?.daily || [];
  return daily.slice(0, 7).map((d) => {
    const v = pickValues(d);
    return {
      time: d.time || d.startTime || null,
      temperatureAvg: v.temperatureAvg ?? v.temperature ?? null,
      temperatureMax: v.temperatureMax ?? null,
      temperatureMin: v.temperatureMin ?? null,
      humidityAvg: v.humidityAvg ?? v.humidity ?? null,
      windSpeedAvg: v.windSpeedAvg ?? v.windSpeed ?? null,
      precipitationProbability: v.precipitationProbability ?? v.precipitationProbabilityAvg ?? null,
      precipitationIntensity: v.precipitationIntensityAvg ?? v.precipitationIntensity ?? null,
      rainAccumulation: v.rainAccumulation ?? v.rainAccumulationSum ?? null,
      weatherCode: v.weatherCodeMax || v.weatherCode || null,
      weather: weatherLabel(v.weatherCodeMax || v.weatherCode),
      uvIndexMax: v.uvIndexMax ?? null,
    };
  });
}

function normalizeCurrent(realtimeBody) {
  const data = realtimeBody?.data || realtimeBody;
  const v = data?.values || {};
  return {
    time: data?.time || null,
    temperature: v.temperature ?? null,
    humidity: v.humidity ?? null,
    windSpeed: v.windSpeed ?? null,
    windGust: v.windGust ?? null,
    precipitationIntensity: v.precipitationIntensity ?? null,
    rainIntensity: v.rainIntensity ?? null,
    weatherCode: v.weatherCode ?? null,
    weather: weatherLabel(v.weatherCode),
    cloudCover: v.cloudCover ?? null,
    uvIndex: v.uvIndex ?? null,
    dewPoint: v.dewPoint ?? null,
    visibility: v.visibility ?? null,
  };
}

/**
 * Farm decision helpers from hourly Tomorrow.io data.
 */
function buildFarmAdvisories(hourly = [], daily = []) {
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
        note: "Favorable spray window (low wind, low rain chance)",
      });
    }
  }

  const frostHours = sample.filter((h) => Number(h.temperature) <= 2);
  const heatHours = sample.filter((h) => Number(h.temperature) >= 36);
  const heavyRainHours = sample.filter(
    (h) =>
      Number(h.precipitationProbability) >= 60 ||
      Number(h.precipitationIntensity ?? h.rainIntensity) >= 2
  );

  const tomorrowDaily = daily[0] || daily[1] || null;
  const advisories = [];

  if (sprayWindows.length) {
    advisories.push({
      id: "spray",
      level: "ok",
      title: "Spray windows available",
      summary: `${sprayWindows.length} hour(s) in the next day look suitable for spraying (wind ≤ 4.5 m/s, low rain chance).`,
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
      summary: `${frostHours.length} hour(s) at or below 2°C — protect sensitive crops.`,
      times: frostHours.slice(0, 4).map((h) => h.time),
    });
  }

  if (heatHours.length) {
    advisories.push({
      id: "heat",
      level: "action",
      title: "Heat stress risk",
      summary: `${heatHours.length} hour(s) ≥ 36°C — consider irrigation timing and worker safety.`,
      times: heatHours.slice(0, 4).map((h) => h.time),
    });
  }

  if (heavyRainHours.length) {
    advisories.push({
      id: "rain",
      level: "watch",
      title: "Heavy rain chance",
      summary: `${heavyRainHours.length} hour(s) with elevated rain probability/intensity — delay fertilizer top-dress if possible.`,
      times: heavyRainHours.slice(0, 4).map((h) => h.time),
    });
  }

  if (tomorrowDaily?.rainAccumulation != null && Number(tomorrowDaily.rainAccumulation) >= 15) {
    advisories.push({
      id: "daily_rain",
      level: "watch",
      title: "Wet day ahead",
      summary: `Daily rain accumulation outlook ~${Number(tomorrowDaily.rainAccumulation).toFixed(1)} mm.`,
    });
  }

  return advisories;
}

/**
 * Full field weather pack for the UI.
 */
async function buildTomorrowFieldWeather(apiKey, lat, lon, { units = "metric" } = {}) {
  const [forecast, realtime] = await Promise.all([
    fetchTomorrowForecast(apiKey, lat, lon, units),
    fetchTomorrowRealtime(apiKey, lat, lon, units),
  ]);

  const timelines = forecast?.timelines || {};
  const hourly = normalizeHourly(timelines);
  const daily = normalizeDaily(timelines);
  const current = realtime?.ok ? normalizeCurrent(realtime.data) : hourly[0] || null;
  const advisories = buildFarmAdvisories(hourly, daily);

  return {
    ok: true,
    provider: "tomorrow.io",
    modelVersion: "tomorrow_field_v1",
    generatedAt: new Date().toISOString(),
    units,
    location: forecast?.location || { lat, lon },
    current,
    hourly,
    daily,
    advisories,
    provenance: {
      sources: ["Tomorrow.io weather/forecast", realtime?.ok ? "weather/realtime" : "hourly fallback"],
      realtimeOk: Boolean(realtime?.ok),
      realtimeError: realtime?.ok ? null : realtime?.error || null,
    },
  };
}

module.exports = {
  buildTomorrowFieldWeather,
  fetchTomorrowForecast,
  fetchTomorrowRealtime,
  buildFarmAdvisories,
  weatherLabel,
};
