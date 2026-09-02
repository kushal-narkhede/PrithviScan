"use strict";

/**
 * Twilio SMS helper — uses REST API (no extra npm dependency).
 */

function isTwilioConfigured(sid, token, from) {
  return Boolean(sid && token && from && sid.length > 10 && !sid.startsWith("PLACEHOLDER"));
}

function formatSmsBody(item) {
  const title = String(item.title || "PrithviScan alert").slice(0, 80);
  const action = String(item.message || item.action || "").slice(0, 120);
  const fieldId = item.fieldId ? String(item.fieldId) : "";
  const link = fieldId
    ? `https://prithviscan.web.app/field.html?id=${encodeURIComponent(fieldId)}`
    : "https://prithviscan.web.app/app.html";
  return `PrithviScan: ${title}. ${action} ${link}`.slice(0, 320);
}

async function sendSms({ accountSid, authToken, from, to, body }) {
  if (!isTwilioConfigured(accountSid, authToken, from)) {
    return { ok: false, status: "not_configured", error: "Twilio secrets not set" };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: "failed",
      error: data.message || `Twilio HTTP ${res.status}`,
      code: data.code || null,
    };
  }
  return {
    ok: true,
    status: "sent",
    messageId: data.sid || null,
    sentAt: new Date().toISOString(),
  };
}

module.exports = { isTwilioConfigured, formatSmsBody, sendSms };
