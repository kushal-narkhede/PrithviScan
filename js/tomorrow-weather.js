/**
 * Render helpers for Tomorrow.io field weather panel.
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

  const hourCards = hourly
    .slice(0, 24)
    .map(
      (h) => `<article class="tmrw-hour">
        <time>${esc(fmtHour(h.time))}</time>
        <strong>${num(h.temperature, 0, "°")}</strong>
        <span>${esc(h.weather || "—")}</span>
        <span class="tmrw-meta">Rain ${num(h.precipitationProbability, 0, "%")}</span>
        <span class="tmrw-meta">Wind ${num(h.windSpeed, 1)} m/s</span>
      </article>`
    )
    .join("");

  const dayCards = daily
    .slice(0, 7)
    .map(
      (d) => `<article class="tmrw-day">
        <time>${esc(fmtDay(d.time))}</time>
        <strong>${num(d.temperatureMin, 0)}° / ${num(d.temperatureMax, 0)}°</strong>
        <span>${esc(d.weather || "—")}</span>
        <span class="tmrw-meta">Rain ${num(d.precipitationProbability, 0, "%")}</span>
        <span class="tmrw-meta">Accum ${num(d.rainAccumulation, 1, " mm")}</span>
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
                .map((w) => `<li>${esc(fmtHour(w.time))} · wind ${num(w.windSpeed, 1)} m/s</li>`)
                .join("")}</ul>`
            : ""
        }
      </article>`
    )
    .join("");

  root.hidden = false;
  root.innerHTML = `
    <div class="tmrw-head">
      <p class="app-kicker">Tomorrow.io</p>
      <h3>Hyperlocal field weather</h3>
      <p class="app-muted">Realtime + hourly/daily forecast with farm spray, frost, heat, and rain advisories.</p>
    </div>

    <div class="tmrw-now">
      <div>
        <span class="tmrw-now-label">Now</span>
        <strong class="tmrw-now-temp">${num(c.temperature, 1, "°C")}</strong>
        <p>${esc(c.weather || "—")}</p>
      </div>
      <div class="outlook-stats harvest-stats">
        <div><span>Humidity</span><strong>${num(c.humidity, 0, "%")}</strong></div>
        <div><span>Wind</span><strong>${num(c.windSpeed, 1)} m/s</strong></div>
        <div><span>Precip</span><strong>${num(c.precipitationIntensity ?? c.rainIntensity, 2)} mm/h</strong></div>
        <div><span>UV</span><strong>${num(c.uvIndex, 0)}</strong></div>
      </div>
    </div>

    <h4 class="tmrw-section-title">Next 24 hours</h4>
    <div class="tmrw-hours" tabindex="0">${hourCards || `<p class="app-muted">No hourly data.</p>`}</div>

    <h4 class="tmrw-section-title">Daily outlook</h4>
    <div class="tmrw-days">${dayCards || `<p class="app-muted">No daily data.</p>`}</div>

    <h4 class="tmrw-section-title">Farm advisories</h4>
    <div class="tmrw-advice-grid">${advice || `<p class="app-muted">No advisories.</p>`}</div>

    <p class="app-muted tmrw-prov">
      ${esc(pack.provider)} · ${esc(pack.modelVersion)} · ${esc(pack.generatedAt || "")}
      ${pack.provenance?.realtimeOk === false ? " · realtime fallback to hourly" : ""}
    </p>`;
}
