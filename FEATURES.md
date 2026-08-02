# PrithviScan — Full Feature List

**Live site:** https://prithviscan.web.app  
**Firebase project:** `prithviscan`  
**Branch:** `cursor/homepage-hero-ffb2`

**Status key**
- **Live** — available on the deployed site today (Spark plan)
- **Paused** — fully coded; waiting for Firebase **Blaze** + Cloud Functions deploy
- **Local-only** — runs on your PC (Python); not part of the website deploy
- **Not built yet** — planned / roadmap only

---

## 1. Marketing homepage

**Status:** Live  
**Pages / files:** `index.html`, `styles.css`, `script.js`, `assets/`

| Feature | Detail |
|---------|--------|
| Brand-first hero | Full-bleed canopy video background; **Prithvi** / **Scan** wordmark as the main signal |
| Hero content | One headline, one short supporting line, CTA group (Get started / See the data stack) |
| Sticky navigation | Links: Data, Intelligence, How it works, Insights; mobile menu toggle |
| Auth-aware nav | Shows **Get started** when signed out; **Open app** + **My Profile** when signed in (`js/nav-auth.js`) |
| NASA data rail | Marketing cards for NASA POWER, MODIS/VIIRS, HLS, SMAP, GPM, Earthdata |
| Intelligence section | Explains fusion → pattern recognition → field decisions |
| How it works | Pipeline: Ingest → Harmonize → Fuse → Interpret → Advise |
| Insights section | Example farmer-style recommendations |
| Motion | Scroll-shrink header, reveal-on-scroll animations, hero video autoplay retry |
| Design system | Forest/leaf palette, Fraunces + Figtree fonts, responsive layout |
| Assets | Logo, logo mark, favicon, `hero-canopy.mp4` |

---

## 2. Authentication

**Status:** Live (must be enabled in Firebase Console: Email/Password + Google)  
**Pages / files:** `auth.html`, `auth.css`, `js/auth.js`, `js/auth-page.js`, `js/firebase-config.js`

| Feature | Detail |
|---------|--------|
| Email / password sign-up | Create account with email, password, optional display name |
| Email / password sign-in | Standard login |
| Google sign-in | Popup; falls back to redirect if popup is blocked |
| Mode tabs | Switch between Sign in and Create account |
| Friendly errors | Maps Firebase error codes to readable messages |
| Auto-redirect | Already signed-in users go straight to `app.html` |
| Post-login destination | Farmer dashboard (`app.html`) |
| Setup banner | Warns if Firebase web config is incomplete |
| Analytics | Optional Firebase Analytics when supported |

---

## 3. My Profile

**Status:** Live  
**Pages / files:** `profile.html`, `js/profile-page.js`

| Feature | Detail |
|---------|--------|
| Auth gate | Unsigned users redirected to `auth.html` |
| Account card | Avatar initials, display name, email |
| Provider label | Shows Google or Email & password |
| Member since | Account creation date |
| Open my fields | Shortcut to farmer dashboard |
| Sign out | Signs out and returns to homepage |

---

## 4. Farmer dashboard (fields + alerts)

**Status:** Fields / map / CRUD **Live**; Alerts API **Paused**  
**Pages / files:** `app.html`, `app.css`, `js/app.js`, `js/fields.js`, `js/map.js`, `js/firebase-db.js`, `js/api.js`

### 4.1 Fields tab (Live)

| Feature | Detail |
|---------|--------|
| Auth-gated dashboard | Must be signed in |
| Welcome line | Greets user by name/email |
| Field list | Cards with name, coordinates, crop type, last insight badge (if any) |
| Open field | Card links to `field.html?id=…` |
| Add field form | Name, optional crop type, lat/lon inputs |
| Leaflet / OSM map | Click map or drag marker to set location (default center: India) |
| Use my location | Browser geolocation fills lat/lon and moves marker |
| Field-vs-not-field check | Calls `classifyLocation` on pick/save — **soft-allows save** while Functions are paused |
| Save to Firestore | Writes under `users/{uid}/fields/{fieldId}` |
| Empty state | Clear prompt when no fields exist yet |

### 4.2 Alerts tab (Paused until Blaze)

| Feature | Detail |
|---------|--------|
| Alerts list | Last alerts for the user (title, message, level, date) |
| Unread badge | Count on Alerts tab |
| Mark read | Marks an alert as read via Cloud Function |
| View field | Jump to the related field detail page |
| Hash route | `#alerts` opens the Alerts tab |
| Spark behavior | Shows message that alerts need Cloud Functions (Blaze) |

---

## 5. Field detail page

**Status:** Shell + delete + cached insight **Live**; NASA refresh / trends **Paused**  
**Pages / files:** `field.html`, `js/field-page.js`

| Feature | Detail |
|---------|--------|
| Field header | Name, coordinates, crop facts |
| Location map | Static Leaflet map centered on the field |
| Latest insight card | Level, title, message, factors, age — loaded from Firestore if previously computed |
| Metrics grid | 7-day rain, avg/max temp, humidity, ET, solar (from saved insight/snapshot data) |
| Satellite chips | SMAP / MODIS availability notes (from Earthdata when Functions are live) |
| Refresh insights | Calls fusion engine (`fuseFieldInsight`) — **Paused** on Spark |
| Trends panel | Outlook card, plain-language trend pills, SVG rain/temp charts, forecast strip — **Paused** |
| Snapshot history | Past daily snapshots strip when data exists |
| Delete field | Confirm + delete from Firestore; return to dashboard |
| Rate-limit messaging | Fusion limited to once per 15 minutes per field (when Functions live) |

---

## 6. Cloud Functions (backend APIs)

**Status:** All **Paused** until Blaze  
**Code:** `functions/index.js`, `functions/lib/trends.js`, `functions/lib/vision.js`  
**Client gate:** `FUNCTIONS_ENABLED = false` in `js/api.js`  
**Deploy config:** stored in `firebase.functions.disabled.json` (not active in `firebase.json`)

| Function | Auth | What it does |
|----------|------|--------------|
| `earthdataStatus` | No | Health check for `EARTHDATA_TOKEN` secret |
| `powerSummary` | Yes | NASA POWER daily weather for a lat/lon (temp, rain, humidity, wind, solar, ET); can save snapshot |
| `fieldEarthSummary` | Yes | Earthdata CMR search for SMAP + MODIS granules near the field |
| `fuseFieldInsight` | Yes | Combines POWER (+ optional satellite flags) into a farmer recommendation; writes insight + alerts; **15 min rate limit** |
| `getAlerts` | Yes | Lists the user’s latest alerts |
| `markAlertRead` | Yes | Marks one alert as read |
| `fieldTrends` | Yes | Past POWER series → trend analysis + **7-day forecast** + outlook text |
| `classifyLocation` | Yes | Fetches satellite imagery tile; RGB vegetation heuristic → field vs not-field |
| `cmrSearch` | Yes | Auth-gated proxy to NASA CMR granule search |

### Fusion recommendation rules (in `fuseFieldInsight`)

1. **Irrigate soon** — low rain + high ET → action  
2. **Low moisture** — moderate dry stress → watch  
3. **Heat stress** — max temp above threshold  
4. **Excess rain** — heavy rainfall  
5. **Disease risk** — high humidity + warm temps  
6. **Conditions OK** — otherwise → info  

---

## 7. Python ML toolkit

**Status:** Local-only  
**Folder:** `ml/`  
**Windows helper:** `ml/train_eurosat.bat`  
**Your dataset path:** `D:\Kushal\EuroSAT_RGB\EuroSAT_RGB`

| Tool | Detail |
|------|--------|
| `preprocess.py` | Load/resize images; greenness (ExG); veg fraction; NDVI proxy; cloud mask; texture; HSV veg ratio |
| `train_field_classifier.py` | Train RandomForest field vs not-field; auto-uses your EuroSAT path; optional `--cnn` (MobileNetV2) |
| `prepare_eurosat.py` | Optional copy of EuroSAT classes into `ml/data/field` and `ml/data/not_field` |
| `infer_field.py` | Classify an image with trained model (or heuristic fallback) |
| `trends.py` | Trend slope + hybrid 7-day forecast + plain-language outlook from POWER-like series |
| `analyze_satellite.py` | True NDVI/EVI helpers, stress mask, RGB patch analysis |
| `DATASETS.md` | Guide to EuroSAT, BigEarthNet, CDL, Agriculture-Vision, etc. |
| `requirements.txt` | numpy, Pillow, OpenCV, scikit-learn, scikit-image, matplotlib, joblib (+ optional TensorFlow) |

### EuroSAT class mapping used for training

| Label | EuroSAT folders |
|-------|-----------------|
| **field** | AnnualCrop, PermanentCrop, Pasture |
| **not_field** | Residential, Industrial, Highway, River, SeaLake, Forest, HerbaceousVegetation |

**Output model:** `ml/models/field_classifier.joblib` (gitignored; train on your PC)

---

## 8. Data model (Firestore)

**Status:** Live (rules deployed)  
**Files:** `firestore.rules`, `firestore.indexes.json`, `js/fields.js`, `js/firebase-db.js`

| Path | Client access | Contents |
|------|---------------|----------|
| `users/{uid}/fields/{fieldId}` | Read / write own | name, lat, lon, cropType, bbox, timestamps, lastInsight |
| `users/{uid}/fields/{fieldId}/snapshots/{date}` | Read only | Daily POWER / Earth summaries (written by Functions) |
| `users/{uid}/fields/{fieldId}/insights/{id}` | Read only | Latest fusion insight (written by Functions) |
| `users/{uid}/alerts/{alertId}` | Read only | Action/watch alerts (written by Functions; mark-read via Function) |

**Security:** Each user can only access `users/{uid}/**`. Clients cannot forge insights or alerts.

---

## 9. Firebase / infra

| Piece | Status | Detail |
|-------|--------|--------|
| Hosting | Live | https://prithviscan.web.app — static HTML/CSS/JS |
| Firestore rules | Live | Per-user isolation |
| Authentication | Live | Email/Password + Google (must be enabled in Console) |
| Cloud Functions | Paused | Need Blaze; config parked in `firebase.functions.disabled.json` |
| Secret: `EARTHDATA_TOKEN` | Paused | Firebase Secret Manager; never in client JS |
| Deploy (current) | — | `npx firebase deploy --only hosting,firestore:rules` |

### Re-enable Functions after Blaze

1. Merge `functions` block from `firebase.functions.disabled.json` into `firebase.json`  
2. Set `FUNCTIONS_ENABLED = true` in `js/api.js`  
3. `firebase functions:secrets:set EARTHDATA_TOKEN`  
4. `firebase deploy --only hosting,firestore:rules,functions`

---

## 10. Quick status matrix

| Feature | Status |
|---------|--------|
| Homepage + branding + hero video | Live |
| Sign in / Sign up (email + Google) | Live |
| My Profile + sign out | Live |
| Farmer dashboard | Live |
| Add / list / open / delete fields | Live |
| Leaflet map + my location | Live |
| Firestore security rules | Live |
| Map field classifier API | Paused |
| NASA POWER weather | Paused |
| Fusion insights (“Irrigate tomorrow”, etc.) | Paused |
| In-app alerts | Paused |
| Field trends + 7-day forecast charts | Paused |
| SMAP / MODIS Earthdata status | Paused |
| Python EuroSAT training / inference | Local-only |
| HLS NDVI overlays | Not built yet |
| GPM realtime rainfall stream | Not built yet |
| Push notifications (FCM) | Not built yet |
| Swap production classifier to trained ML model | Not built yet |

---

## 11. What you can try right now

1. Open https://prithviscan.web.app  
2. Create an account / sign in  
3. Open the app → drop a pin on the map → save a field  
4. Open the field page (insight/trends buttons will explain they need Blaze)  
5. On your PC (optional): run `ml\train_eurosat.bat` to train the EuroSAT model locally  

---

*This file is the product feature inventory for PrithviScan. Update it when major capabilities ship or change status.*
