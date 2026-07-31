const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "us-central1" });

// Firebase Secret Manager — set with:
//   firebase functions:secrets:set EARTHDATA_TOKEN
const earthdataToken = defineSecret("EARTHDATA_TOKEN");

/**
 * Health check that confirms the Earthdata secret is present (does not return the token).
 * GET /earthdataStatus
 */
exports.earthdataStatus = onRequest(
  { secrets: [earthdataToken], cors: true },
  (req, res) => {
    const token = earthdataToken.value();
    const configured = Boolean(token && token.length > 20);
    res.status(200).json({
      ok: configured,
      service: "earthdata",
      configured,
      hint: configured
        ? "Earthdata token is loaded in Firebase Secrets."
        : "Run: firebase functions:secrets:set EARTHDATA_TOKEN",
    });
  }
);

/**
 * Proxy a CMR granule search using the server-side Earthdata token.
 * Example:
 *   GET /cmrSearch?short_name=SPL3SMP_E&bounding_box=77.5,12.9,77.7,13.1&temporal=2024-01-01T00:00:00Z,2024-01-07T23:59:59Z
 */
exports.cmrSearch = onRequest(
  { secrets: [earthdataToken], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const token = earthdataToken.value();
      if (!token) {
        res.status(500).json({ error: "EARTHDATA_TOKEN secret is not set." });
        return;
      }

      const params = new URLSearchParams();
      const shortName = req.query.short_name || "SPL3SMP_E";
      const bbox = req.query.bounding_box || "77.5,12.9,77.7,13.1";
      const temporal =
        req.query.temporal || "2024-01-01T00:00:00Z,2024-01-07T23:59:59Z";
      const pageSize = req.query.page_size || "5";

      params.set("short_name", String(shortName));
      params.set("bounding_box", String(bbox));
      params.set("temporal", String(temporal));
      params.set("page_size", String(pageSize));

      const url = `https://cmr.earthdata.nasa.gov/search/granules.json?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const text = await response.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }

      res.status(response.status).json({
        ok: response.ok,
        status: response.status,
        result: body,
      });
    } catch (err) {
      res.status(500).json({
        error: "CMR search failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
