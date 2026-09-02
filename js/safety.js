/**
 * Safety checks & human escalation flags (feature 5.3).
 */

const HIGH_RISK_KEYS = new Set([
  "disease_risk",
  "heat_stress",
  "excess_rain",
]);

const HIGH_RISK_WORDS = [
  "pesticide",
  "spray",
  "fungicide",
  "herbicide",
  "chemical",
  "poison",
];

export function assessInsightRisk(insight = {}) {
  const text = [
    insight.title,
    insight.action,
    insight.message,
    insight.why,
    ...(insight.factors || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const wordHit = HIGH_RISK_WORDS.find((w) => text.includes(w));
  const ruleHit = (insight.ruleTraces || []).some(
    (r) => r.fired && (HIGH_RISK_KEYS.has(String(r.id).replace(/^R\d+_?/, "").replace(/^[a-z]\d*_/, "")) || /disease|heat|excess/.test(r.id))
  );
  const levelHit = insight.level === "action";

  const highRisk = Boolean(wordHit) || ruleHit || (levelHit && /disease|spray|pesticide/.test(text));

  return {
    highRisk,
    needsConfirmation: highRisk || insight.level === "action",
    escalateToHuman: highRisk,
    reason: wordHit
      ? `Mentions potentially risky action (“${wordHit}”). Confirm with a local advisor before acting.`
      : highRisk
        ? "This recommendation may have safety or legal impact. Confirm before acting."
        : insight.level === "action"
          ? "Action-level insight — review factors before you change field practice."
          : null,
    disclaimer:
      "Decision support only. Not a substitute for local agronomist or extension advice. You confirm any high-risk field action.",
  };
}

export function confirmRiskyAction(risk) {
  if (!risk?.needsConfirmation) return true;
  const msg = [
    "Safety check",
    "",
    risk.reason || "Please confirm before acting on this recommendation.",
    "",
    risk.disclaimer,
    "",
    "Do you confirm you reviewed this with local guidance where needed?",
  ].join("\n");
  return window.confirm(msg);
}
