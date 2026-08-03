/**
 * Render helpers for Tomorrow.io full weather field set (farmer UI).
 */

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtTime(iso, opts = {}) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, opts);
}

function fmtHour(iso) {
  return fmtTime(iso, { weekday: "short", hour: "numeric" });
}

function fmtDay(iso) {
  return fmtTime(iso, { weekday: "short", month: "short", day: "numeric" });
}

function num(v, digits = 0, suffix = "") {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return `${Number(v).toFixed(digits)}${suffix}`;
}

function deg(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const d = Number(v);
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round(d / 45) % 8;
  return `${Math.round(d)}° ${dirs[i]}`;
}

function stat(label, value) {
  return `<div><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function section(title, body) {
  if (!body) return "";
  return `<section class="tmrw-block"><h4 class="tmrw-section-title">${esc(title)}</h4>${body}</section>`;
}

export function renderTomorrowWeather(root, pack) {
  if (!root) return;
  if (!pack?.ok) {
    root.hidden = false;
    root.innerHTML = `
      <div class="tmrw-banner tmrw-banner--warn">
        <strong>Tomorrow.io not ready</strong>
        <p>${esc(pack?.error || "Could not load hyperlocal weather.")}</p>
        <p class="app-muted">${esc(pack?.hint || "Set TOMORROW_API_KEY in Firebase Secret Manager, then redeploy Functions.")}</p>
      </div>`;
    return;
  }

  const c = pack.current || {};
  const hourly = pack.hourly || [];
  const daily = pack.daily || [];
  const advisories = pack.advisories || [];
  const units = pack.units === "imperial" ? "imperial" : "metric";
  const tempU = units === "imperial" ? "°F" : "°C";
  const windU = units === "imperial" ? "mph" : "m/s";
  const rainU = units === "imperial" ? "in" : "mm";
  const rainRateU = units === "imperial" ? "in/h" : "mm/h";
  const visU = units === "imperial" ? "mi" : "km";
  const pressU = units === "imperial" ? "inHg" : "hPa";

  const hourCards = hourly
    .slice(0, 24)
    .map(
      (h) => `<article class="tmrw-hour" title="${esc(h.weather || "")}">
        <time>${esc(fmtHour(h.time))}</time>
        <strong>${num(h.temperature, 0)}°</strong>
        <span>${esc(h.weather || "—")}</span>
        <span class="tmrw-meta">Feels ${num(h.temperatureApparent, 0, "°")}</span>
        <span class="tmrw-meta">Rain ${num(h.precipitationProbability, 0, "%")}</span>
        <span class="tmrw-meta">Wind ${num(h.windSpeed, 1)} ${esc(windU)}</span>
        <span class="tmrw-meta">Gust ${num(h.windGust, 1)}</span>
        <span class="tmrw-meta">RH ${num(h.humidity, 0, "%")}</span>
        <span class="tmrw-meta">UV ${num(h.uvIndex, 0)}</span>
        <span class="tmrw-meta">ET ${num(h.evapotranspiration, 2)}</span>
        <span class="tmrw-meta">Heat ${num(h.ezHeatStressIndex, 1)}</span>
      </article>`
    )
    .join("");

  const dayCards = daily
    .slice(0, 7)
    .map(
      (d) => `<article class="tmrw-day">
        <time>${esc(fmtDay(d.time))}</time>
        <strong>${num(d.temperatureMin, 0)}° / ${num(d.temperatureMax, 0)}°</strong>
        <span>${esc(d.weatherFullDay || d.weather || "—")}</span>
        <span class="tmrw-meta">Rain ${num(d.precipitationProbability, 0, "%")}</span>
        <span class="tmrw-meta">Accum ${num(d.rainAccumulation, 1, ` ${rainU}`)}</span>
        <span class="tmrw-meta">ET ${num(d.evapotranspiration, 1, ` ${rainU}`)}</span>
        <span class="tmrw-meta">UV max ${num(d.uvIndex, 0)}</span>
        <span class="tmrw-meta">GDD maize ${num(d.gdd10To30, 1)}</span>
        <span class="tmrw-meta">↑ ${esc(fmtTime(d.sunriseTime, { hour: "numeric", minute: "2-digit" }))}</span>
        <span class="tmrw-meta">↓ ${esc(fmtTime(d.sunsetTime, { hour: "numeric", minute: "2-digit" }))}</span>
      </article>`
    )
    .join("");

  const advice = advisories
    .map(
      (a) => `<article class="tmrw-advice is-${esc(a.level || "watch")}">
        <h4>${esc(a.title)}</h4>
        <p>${esc(a.summary)}</p>
        ${
          a.windows?.length
            ? `<ul>${a.windows
                .slice(0, 4)
                .map((w) => `<li>${esc(fmtHour(w.time))} · wind ${num(w.windSpeed, 1)} ${esc(windU)}</li>`)
                .join("")}</ul>`
            : ""
        }
      </article>`
    )
    .join("");

  const nowStats = `
    <div class="outlook-stats harvest-stats tmrw-stats">
      ${stat("Feels like", num(c.temperatureApparent, 1, tempU))}
      ${stat("Dew point", num(c.dewPoint, 1, tempU))}
      ${stat("Humidity", num(c.humidity, 0, "%"))}
      ${stat("Wind", `${num(c.windSpeed, 1)} ${windU}`)}
      ${stat("Wind dir", deg(c.windDirection))}
      ${stat("Gust", `${num(c.windGust, 1)} ${windU}`)}
      ${stat("Pressure (sfc)", `${num(c.pressureSurfaceLevel, 1)} ${pressU}`)}
      ${stat("Pressure (MSL)", `${num(c.pressureSeaLevel, 1)} ${pressU}`)}
      ${stat("Precip intensity", `${num(c.precipitationIntensity, 2)} ${rainRateU}`)}
      ${stat("Rain intensity", `${num(c.rainIntensity, 2)} ${rainRateU}`)}
      ${stat("Snow intensity", `${num(c.snowIntensity, 2)} ${rainRateU}`)}
      ${stat("Freezing rain", `${num(c.freezingRainIntensity, 2)} ${rainRateU}`)}
      ${stat("Sleet intensity", `${num(c.sleetIntensity, 2)} ${rainRateU}`)}
      ${stat("Precip chance", num(c.precipitationProbability, 0, "%"))}
      ${stat("Precip type", esc(c.precipitationTypeLabel || "—"))}
      ${stat("Rain accum (1h)", `${num(c.rainAccumulation, 2)} ${rainU}`)}
      ${stat("Snow accum", `${num(c.snowAccumulation, 2)} ${rainU}`)}
      ${stat("Snow depth", `${num(c.snowDepth, 1)} ${units === "imperial" ? "in" : "cm"}`)}
      ${stat("Ice accum", `${num(c.iceAccumulation, 2)} ${rainU}`)}
      ${stat("Visibility", `${num(c.visibility, 1)} ${visU}`)}
      ${stat("Cloud cover", num(c.cloudCover, 0, "%"))}
      ${stat("Cloud base", `${num(c.cloudBase, 2)} ${visU}`)}
      ${stat("Cloud ceiling", `${num(c.cloudCeiling, 2)} ${visU}`)}
      ${stat("UV index", `${num(c.uvIndex, 0)} (${esc(c.uvLabel || "—")})`)}
      ${stat("UV health", `${num(c.uvHealthConcern, 0)} (${esc(c.uvHealthLabel || "—")})`)}
      ${stat("Thunderstorm %", num(c.thunderstormProbability, 0, "%"))}
      ${stat("Moon phase", esc(c.moonPhaseLabel || "—"))}
      ${stat("Evapotranspiration", `${num(c.evapotranspiration, 2)} ${rainU}`)}
      ${stat("Heat stress (Ezra-Zohar)", `${num(c.ezHeatStressIndex, 1)} · ${esc(c.heatStressLabel || "—")}`)}
      ${stat("GDD maize/soy (10–30)", num(c.gdd10To30, 2))}
      ${stat("GDD sunflower (10–31)", num(c.gdd10To31, 2))}
      ${stat("GDD sorghum (8–30)", num(c.gdd08To30, 2))}
      ${stat("GDD potato (3–25)", num(c.gdd03To25, 2))}
    </div>`;

  const catalog = (pack.fieldsRequested || [])
    .map((id) => `<li><code>${esc(id)}</code></li>`)
    .join("");

  root.hidden = false;
  root.innerHTML = `
    <div class="tmrw-head">
      <p class="app-kicker">Tomorrow.io</p>
      <h3>Full field weather</h3>
      <p class="app-muted">
        All available Tomorrow.io layers for this pin — temperature, wind, pressure, precipitation types,
        UV, clouds, sun/moon, ET, growing degree days, and heat stress — plus farm advisories.
      </p>
      ${pack.fieldNote ? `<p class="tmrw-note">${esc(pack.fieldNote)}</p>` : ""}
    </div>

    <div class="tmrw-now">
      <div>
        <span class="tmrw-now-label">Now</span>
        <strong class="tmrw-now-temp">${num(c.temperature, 1)}${esc(tempU)}</strong>
        <p>${esc(c.weather || "—")}</p>
        <p class="app-muted">${esc(fmtTime(c.time))}</p>
      </div>
      <div class="outlook-stats harvest-stats">
        ${stat("Humidity", num(c.humidity, 0, "%"))}
        ${stat("Wind", `${num(c.windSpeed, 1)} ${windU}`)}
        ${stat("Precip", `${num(c.precipitationIntensity ?? c.rainIntensity, 2)} ${rainRateU}`)}
        ${stat("UV", num(c.uvIndex, 0))}
      </div>
    </div>

    ${section("Complete conditions (all layers)", nowStats)}

    ${section(
      "Next 24 hours",
      `<div class="tmrw-hours" tabindex="0">${hourCards || `<p class="app-muted">No hourly data.</p>`}</div>`
    )}

    ${section(
      "Daily outlook",
      `<div class="tmrw-days">${dayCards || `<p class="app-muted">No daily data.</p>`}</div>`
    )}

    ${section(
      "Farm advisories",
      `<div class="tmrw-advice-grid">${advice || `<p class="app-muted">No advisories.</p>`}</div>`
    )}

    <details class="tmrw-fields">
      <summary>Data fields loaded (${(pack.fieldsRequested || []).length})</summary>
      <ul class="tmrw-field-list">${catalog}</ul>
      <p class="app-muted">Values that show “—” are not returned for this time step or plan. Agriculture layers (GDD / ET / heat stress) need plan support.</p>
    </details>

    <p class="app-muted tmrw-prov">
      ${esc(pack.provider)} · ${esc(pack.modelVersion)} · ${esc(pack.generatedAt || "")}
      · ${(pack.provenance?.fieldsCount ?? 0)} fields
      ${pack.provenance?.realtimeOk === false ? " · realtime fallback" : ""}
    </p>`;
}
