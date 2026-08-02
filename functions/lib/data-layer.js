/**
 * Ensemble data layer stub (feature 3.2).
 * Normalize weather/satellite inputs so fusion can mix POWER, GPM, ECMWF, SMAP, etc.
 *
 * Currently only NASA POWER is wired in production Functions.
 * Additional providers return { available: false } until Blaze + API keys are ready.
 */

function avg(obj) {
  const vals = Object.values(obj || {}).filter((v) => Number.isFinite(v) && v !== -999);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function sum(obj) {
  const vals = Object.values(obj || {}).filter((v) => Number.isFinite(v) && v !== -999);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0);
}

/** Normalize POWER parameter block → common weather schema */
function fromPower(parameter = {}, days = 7) {
  return {
    provider: "nasa_power",
    available: true,
    windowDays: days,
    units: { rain: "mm", temp: "C", humidity: "pct", et: "mm", solar: "kWh/m2/d" },
    rain_mm: sum(parameter.PRECTOTCORR),
    avgTemp_c: avg(parameter.T2M),
    maxTemp_c: avg(parameter.T2M_MAX),
    humidity_pct: avg(parameter.RH2M),
    et_mm: sum(parameter.EVPTRNS),
    solar: avg(parameter.ALLSKY_SFC_SW_DWN),
  };
}

function unavailable(provider, reason) {
  return { provider, available: false, reason };
}

/**
 * Fetch ensemble weather bundle. Extra providers are stubs for now.
 */
async function fetchWeatherEnsemble({ lat, lon, days = 7, powerParameter = null }) {
  const sources = [];
  if (powerParameter) {
    sources.push(fromPower(powerParameter, days));
  } else {
    sources.push(unavailable("nasa_power", "No POWER payload provided"));
  }

  // Placeholders — wire real APIs after Blaze + licensing
  sources.push(unavailable("gpm", "Not configured — needs Earthdata/GPM access"));
  sources.push(unavailable("ecmwf", "Not configured — needs forecast API key"));
  sources.push(unavailable("sentinel", "Not configured — needs Copernicus / Earthdata"));
  sources.push(unavailable("landsat", "Not configured — needs Earthdata / USGS"));

  const primary = sources.find((s) => s.available) || sources[0];
  return {
    primary,
    sources,
    normalized: primary?.available
      ? {
          totalRain_mm: primary.rain_mm,
          avgTemp_c: primary.avgTemp_c,
          maxTemp_c: primary.maxTemp_c,
          avgHumidity_pct: primary.humidity_pct,
          totalET_mm: primary.et_mm,
          avgSolar: primary.solar,
          powerDays: days,
        }
      : null,
  };
}

module.exports = {
  fromPower,
  fetchWeatherEnsemble,
  unavailable,
};
