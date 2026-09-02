/**
 * Bulk import/export for fields (feature 4.2).
 * Supports CSV and GeoJSON Point FeatureCollections.
 */

const CROP_ALIASES = {
  wheat: "Wheat",
  rice: "Rice",
  paddy: "Rice",
  cotton: "Cotton",
  maize: "Maize",
  corn: "Maize",
  soybean: "Soybean",
  sugarcane: "Sugarcane",
  millet: "Millet",
  sorghum: "Sorghum",
  pulses: "Pulses",
  vegetables: "Vegetables",
};

export function normalizeCrop(raw) {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  if (!key) return null;
  return CROP_ALIASES[key] || String(raw).trim();
}

function validCoords(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function roundKey(lat, lon, name) {
  return `${String(name || "").trim().toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
}

/** Parse simple CSV with header row. */
export function parseFieldsCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one field.");

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = {
    name: headers.findIndex((h) => ["name", "field", "field_name", "fieldname"].includes(h)),
    lat: headers.findIndex((h) => ["lat", "latitude", "y"].includes(h)),
    lon: headers.findIndex((h) => ["lon", "lng", "long", "longitude", "x"].includes(h)),
    crop: headers.findIndex((h) => ["crop", "croptype", "crop_type", "crop type"].includes(h)),
  };
  if (idx.lat < 0 || idx.lon < 0) {
    throw new Error("CSV must include lat/latitude and lon/longitude columns.");
  }

  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const lat = Number(cols[idx.lat]);
    const lon = Number(cols[idx.lon]);
    const name = idx.name >= 0 ? cols[idx.name] : `Field ${i}`;
    const crop = idx.crop >= 0 ? cols[idx.crop] : "";
    if (!validCoords(lat, lon)) {
      errors.push(`Row ${i + 1}: invalid coordinates`);
      continue;
    }
    rows.push({
      name: String(name || `Field ${i}`).trim() || `Field ${i}`,
      lat,
      lon,
      cropType: normalizeCrop(crop),
    });
  }
  return { rows, errors };
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/** Parse GeoJSON Point / Feature / FeatureCollection. */
export function parseFieldsGeoJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid GeoJSON — could not parse JSON.");
  }

  let features = [];
  if (data.type === "FeatureCollection") features = data.features || [];
  else if (data.type === "Feature") features = [data];
  else if (data.type === "Point") {
    features = [{ type: "Feature", geometry: data, properties: {} }];
  } else {
    throw new Error("GeoJSON must be a Point Feature or FeatureCollection.");
  }

  const rows = [];
  const errors = [];
  features.forEach((f, i) => {
    const g = f?.geometry;
    if (!g || g.type !== "Point" || !Array.isArray(g.coordinates)) {
      errors.push(`Feature ${i + 1}: only Point geometries are supported`);
      return;
    }
    const [lon, lat] = g.coordinates.map(Number);
    if (!validCoords(lat, lon)) {
      errors.push(`Feature ${i + 1}: invalid coordinates`);
      return;
    }
    const p = f.properties || {};
    rows.push({
      name: String(p.name || p.Name || p.field || `Field ${i + 1}`).trim(),
      lat,
      lon,
      cropType: normalizeCrop(p.cropType || p.crop || p.Crop || ""),
      bbox: p.bbox || null,
    });
  });
  return { rows, errors };
}

/** Drop rows that match existing fields (name + rounded lat/lon). */
export function dedupeAgainstExisting(rows, existing = []) {
  const seen = new Set(existing.map((f) => roundKey(Number(f.lat), Number(f.lon), f.name)));
  const unique = [];
  let skipped = 0;
  for (const row of rows) {
    const key = roundKey(row.lat, row.lon, row.name);
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return { unique, skipped };
}

export function fieldsToCsv(fields = []) {
  const header = "id,name,lat,lon,cropType,lastInsightLevel,lastInsightTitle";
  const lines = fields.map((f) =>
    [
      csvEscape(f.id),
      csvEscape(f.name),
      f.lat,
      f.lon,
      csvEscape(f.cropType || ""),
      csvEscape(f.lastInsight?.level || ""),
      csvEscape(f.lastInsight?.title || ""),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export function fieldsToGeoJson(fields = []) {
  return {
    type: "FeatureCollection",
    features: fields.map((f) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(f.lon), Number(f.lat)],
      },
      properties: {
        id: f.id,
        name: f.name,
        cropType: f.cropType || null,
        lastInsight: f.lastInsight || null,
      },
    })),
  };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
