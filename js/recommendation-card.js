/**
 * Compact explainable recommendation cards for alerts and insights.
 */

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function levelClass(level) {
  if (level === "action") return "level-action";
  if (level === "watch") return "level-watch";
  return "level-info";
}

function normalizePayload(item) {
  const level = item.level || item.lastInsight?.level || "info";
  const confidence =
    typeof item.confidence === "number"
      ? item.confidence
      : typeof item.lastInsight?.confidence === "number"
        ? item.lastInsight.confidence
        : null;
  const why = item.why || item.message || item.lastInsight?.title || "";
  const action = item.action || item.lastInsight?.action || "";
  const evidence = item.evidence || item.factors?.map((f) => ({ label: "Factor", value: f })) || [];
  const title = item.title || item.name || "Recommendation";
  const fieldId = item.fieldId || item.id || null;
  const fieldName = item.fieldName || null;
  const orgId = item.orgId || null;
  const alertId = item.alertId || item.id || null;
  const insightId = item.insightId || "latest";

  return {
    level,
    confidence,
    why,
    action,
    evidence: evidence.slice(0, 2),
    title,
    fieldId,
    fieldName,
    orgId,
    alertId,
    insightId,
    acknowledgedAt: item.acknowledgedAt || null,
    acknowledgedBy: item.acknowledgedBy || null,
    read: Boolean(item.read),
  };
}

/**
 * @param {object} item - alert or insight payload
 * @param {object} handlers - { onAcknowledge, onCreateTask, onFeedback, onMore }
 */
export function renderRecommendationCard(item, handlers = {}) {
  const p = normalizePayload(item);
  const pct = p.confidence != null ? Math.round(p.confidence * 100) : null;
  const fieldHref = p.fieldId
    ? `field.html?id=${encodeURIComponent(p.fieldId)}${p.orgId ? `&org=${encodeURIComponent(p.orgId)}` : ""}`
    : null;

  const evidenceHtml = p.evidence.length
    ? `<ul class="rec-card-evidence">${p.evidence
        .map(
          (e) =>
            `<li><strong>${esc(e.label || e.metric || "Evidence")}</strong>: ${esc(String(e.value ?? ""))}${e.unit ? ` ${esc(e.unit)}` : ""}</li>`
        )
        .join("")}</ul>`
    : "";

  const ackBadge = p.acknowledgedAt
    ? `<span class="rec-card-badge rec-card-ack">Acknowledged</span>`
    : "";

  return `
    <article class="rec-card ${levelClass(p.level)}" data-alert-id="${esc(p.alertId || "")}" data-field-id="${esc(p.fieldId || "")}">
      <header class="rec-card-head">
        <span class="rec-card-level">${esc(p.level === "action" ? "Action" : p.level === "watch" ? "Watch" : "Info")}</span>
        ${pct != null ? `<span class="rec-card-conf">${pct}% confidence</span>` : ""}
        ${ackBadge}
      </header>
      <h3 class="rec-card-title">${esc(p.title)}</h3>
      ${p.action ? `<p class="rec-card-action"><strong>Action:</strong> ${esc(p.action)}</p>` : ""}
      ${p.why ? `<p class="rec-card-why">${esc(p.why)}</p>` : ""}
      ${evidenceHtml}
      <div class="rec-card-actions">
        ${
          handlers.showAcknowledge !== false && p.alertId && !p.acknowledgedAt
            ? `<button type="button" class="app-btn-primary rec-ack-btn" data-alert-id="${esc(p.alertId)}">Acknowledge</button>`
            : ""
        }
        ${
          handlers.showCreateTask !== false && p.fieldId
            ? `<button type="button" class="app-btn-ghost rec-task-btn" data-field-id="${esc(p.fieldId)}" data-org="${esc(p.orgId || "")}">Create task</button>`
            : ""
        }
        ${fieldHref ? `<a class="app-btn-ghost" href="${fieldHref}">More details</a>` : ""}
      </div>
      ${
        handlers.showFeedback !== false && p.fieldId
          ? `<div class="rec-card-feedback">
              <button type="button" class="rec-fb-btn" data-helpful="1" title="Helpful">👍</button>
              <button type="button" class="rec-fb-btn" data-helpful="0" title="Not helpful">👎</button>
              <button type="button" class="rec-fb-btn rec-fb-wrong" data-wrong="1" title="Wrong action">Wrong</button>
            </div>`
          : ""
      }
    </article>`;
}

export function bindRecommendationCard(container, handlers = {}) {
  if (!container) return;

  container.querySelectorAll(".rec-ack-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const alertId = btn.dataset.alertId;
      if (!alertId || !handlers.onAcknowledge) return;
      btn.disabled = true;
      try {
        await handlers.onAcknowledge(alertId);
      } finally {
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll(".rec-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      handlers.onCreateTask?.({
        fieldId: btn.dataset.fieldId,
        orgId: btn.dataset.org || null,
      });
    });
  });

  container.querySelectorAll(".rec-fb-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".rec-card");
      const fieldId = card?.dataset.fieldId;
      if (!fieldId || !handlers.onFeedback) return;
      const helpful = btn.dataset.helpful != null ? btn.dataset.helpful === "1" : null;
      const wrongAction = btn.classList.contains("rec-fb-wrong");
      btn.disabled = true;
      try {
        await handlers.onFeedback({ fieldId, helpful, wrongAction });
        card?.querySelector(".rec-card-feedback")?.classList.add("is-sent");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

export { normalizePayload, esc };
