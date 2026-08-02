/**
 * Offline read-cache for last field insight + list (PWA companion to sw.js).
 */

const FIELD_KEY = "prithvi_offline_field_v1";
const LIST_KEY = "prithvi_offline_fields_v1";
const QUEUE_KEY = "prithvi_offline_queue_v1";

export function cacheFieldOffline(field, insight, health) {
  try {
    const payload = {
      savedAt: Date.now(),
      field: {
        id: field.id,
        name: field.name,
        lat: field.lat,
        lon: field.lon,
        cropType: field.cropType,
        orgId: field.orgId || null,
        sownAt: field.sownAt || null,
        lastInsight: field.lastInsight || null,
      },
      insight: insight || null,
      health: health || null,
    };
    localStorage.setItem(FIELD_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function readCachedField() {
  try {
    return JSON.parse(localStorage.getItem(FIELD_KEY) || "null");
  } catch {
    return null;
  }
}

export function cacheFieldsList(fields) {
  try {
    localStorage.setItem(
      LIST_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        fields: (fields || []).map((f) => ({
          id: f.id,
          name: f.name,
          lat: f.lat,
          lon: f.lon,
          cropType: f.cropType,
          orgId: f.orgId || null,
          lastInsight: f.lastInsight || null,
          healthNdvi: f.healthNdvi ?? null,
          healthLabel: f.healthLabel || null,
        })),
      })
    );
  } catch {
    /* ignore */
  }
}

export function readCachedFieldsList() {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) || "null");
  } catch {
    return null;
  }
}

export function queueOfflineAction(action) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    q.push({ ...action, queuedAt: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* ignore */
  }
}

export function drainOfflineQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    localStorage.setItem(QUEUE_KEY, "[]");
    return q;
  } catch {
    return [];
  }
}
