# PrithviScan

Earth-intelligence platform for farmers — fusing NASA satellite data into field-level recommendations.

**Live:** https://prithviscan.web.app

**Full feature list:** [`FEATURES.md`](FEATURES.md)  
**Partner API contract:** [`docs/PARTNER_API.md`](docs/PARTNER_API.md)

---

## Local preview

```bash
python3 -m http.server 8000
# marketing site: http://localhost:8000
# farmer app:     http://localhost:8000/app.html (requires sign-in)
```

---

## Farmer app — what works

| Feature | Status |
|---------|--------|
| Homepage + branding | Done |
| Sign in / Sign up (email + Google) | Done |
| My Profile + sign-out | Done |
| Farmer dashboard (app.html) | Done |
| Add field on Leaflet/OSM map | Done |
| Field detail page | Done |
| **NASA POWER weather** (temp, rain, ET, solar) | Done — via Cloud Function |
| **Fusion engine** ("Irrigate tomorrow" etc.) | Done — via Cloud Function |
| **In-app alerts** (action / watch) | Done — Firestore + UI |
| **Satellite status** (SMAP, MODIS via Earthdata) | Done — needs real token |
| Security rules (per-user Firestore isolation) | Done |
| Auth on all Cloud Functions | Done |
| Rate limiting (15 min / field) | Done |

---

## One-time setup (Firebase Console)

1. **Enable Firestore** in production mode
2. **Enable Authentication** → Email/Password + Google
3. **Enable Hosting** (done by default)
4. **Upgrade to Blaze** later (only needed for Cloud Functions + Secrets)

---

## Deploy (Spark-safe — current default)

Cloud Functions are **disabled** until Blaze (see `firebase.functions.disabled.json` and `FUNCTIONS_ENABLED` in `js/api.js`).

```bash
git checkout cursor/homepage-hero-ffb2
git pull

# Deploy site + security rules only
npx firebase deploy --only hosting,firestore:rules
```

### After upgrading to Blaze

1. Merge the `functions` block from `firebase.functions.disabled.json` back into `firebase.json`
2. Set `FUNCTIONS_ENABLED = true` in `js/api.js`
3. Set secrets and deploy functions:

```bash
firebase functions:secrets:set EARTHDATA_TOKEN
firebase deploy --only hosting,firestore:rules,functions
```

---

## Enable Firebase Authentication providers

Firebase Console → **Authentication** → Sign-in method → enable:
- Email/Password
- Google

---

## Cloud Functions reference

| Function | Auth | Rate limit | Purpose |
|----------|------|-----------|---------|
| `powerSummary` | Required | — | NASA POWER weather for a field |
| `fuseFieldInsight` | Required | 15 min/field | Fusion → recommendation + alerts |
| `fieldEarthSummary` | Required | — | CMR search for SMAP + MODIS granules |
| `getAlerts` | Required | — | List user alerts |
| `markAlertRead` | Required | — | Mark an alert read |
| `earthdataStatus` | None | — | Health-check for Earthdata secret |
| `cmrSearch` | Required | — | Raw CMR granule search proxy |

Functions URL: `https://us-central1-prithviscan.cloudfunctions.net/<name>`

---

## Image ML + trends

Python package in [`ml/`](ml/):
- `preprocess.py` — OpenCV/skimage greenness, NDVI proxy, cloud mask
- `train_field_classifier.py` — train field vs not-field (RandomForest or CNN)
- `infer_field.py` — classify an image
- `trends.py` — trend + 7-day forecast from NASA POWER series
- [`DATASETS.md`](ml/DATASETS.md) — where to get ~10k field images (EuroSAT, BigEarthNet, …)

Train when you have images:

```bash
pip install -r ml/requirements.txt
# put images in ml/data/field and ml/data/not_field
python -m ml.train_field_classifier
```

App features:
- **Map gate:** clicking a point runs `classifyLocation` (imagery heuristic; swap in trained model later)
- **Field page:** past snapshots, animated trend charts, plain-language explanations, next-week outlook (`fieldTrends`)

## After this MVP

- Replace heuristic classifier with your trained CNN weights
- HLS 10m NDVI raster overlays
- GPM 30-minute rainfall streaming
- FCM push notifications

---

## Security notes

- Earthdata token is stored in **Firebase Secret Manager** only — never in client JS
- Firestore rules: each user can read/write only `users/{uid}/**`
- Insights and alerts are written only by Cloud Functions (admin SDK)
- All Cloud Functions verify Firebase ID token before execution
