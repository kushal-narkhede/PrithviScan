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

## 10. Farmer-facing features (high impact)

Features that directly increase farmer value and adoption.

### 2.1 Persistent last-view and session restore
| | |
|---|---|
| **Status** | Live (client + Firestore) |
| **Priority** | Medium |
| **What** | Open a field to the last viewed insight/page and scroll position. |
| **Why** | Improves usability for frequent users. |
| **Implementation** | `js/session.js` saves `users/{uid}.lastSession` and `fields/{id}.lastView` (scrollY, section). Field page restores on load; dashboard shows **Continue where you left off**. |

### 2.2 Actionable recommendations with confidence and provenance
| | |
|---|---|
| **Status** | Code ready — UI Live; generation Paused until Blaze Functions |
| **Priority** | Critical |
| **What** | Each insight includes clear action, confidence score, data sources, timestamp, and why (factors). |
| **Why** | Farmers need to trust and understand recommendations. |
| **Implementation** | `fuseFieldInsight` now emits `action`, `confidence`, `evidence[]`, `why`, `provenance{sources,model,windowDays,generatedAt}`. Field page renders action line, confidence bar, evidence list, and source line. Stored on `insights/latest`. |

### 2.3 Localized language and units
| | |
|---|---|
| **Status** | Planned |
| **Priority** | Critical |
| **What** | Multi-language UI, local units (mm/inches, °C/°F), and region-specific crop names. |
| **Why** | Global adoption requires localization. |
| **Implementation notes** | Use i18n framework; community translations; detect locale from browser or profile preferences. |

### 2.4 SMS / IVR and low-bandwidth channels
| | |
|---|---|
| **Status** | Planned (needs Blaze + Twilio/MessageBird) |
| **Priority** | Critical |
| **What** | Deliver alerts and recommendations via SMS, WhatsApp, or IVR for non-smartphone users. |
| **Why** | Many farmers lack smartphones or reliable data. |
| **Implementation notes** | Integrate Twilio/MessageBird; concise SMS templates; IVR flows for voice delivery in local languages. Opt-in consent required. |

### 2.5 Offline data capture and sync
| | |
|---|---|
| **Status** | Planned |
| **Priority** | High |
| **What** | Allow field notes, photos, and manual measurements to be captured offline and synced later. |
| **Why** | Fieldwork often offline; photos and notes are valuable ground truth. |
| **Implementation notes** | IndexedDB/local storage; conflict resolution UI; attach metadata (timestamp, GPS). |

### 2.6 Photo-based diagnostics and farmer uploads
| | |
|---|---|
| **Status** | Planned (local ML pieces exist under `ml/`) |
| **Priority** | High |
| **What** | Allow farmers to upload photos of crops/pests/disease for automated classification or expert review. |
| **Why** | Visual evidence improves diagnosis and trust. |
| **Implementation notes** | Integrate classifyLocation-style heuristics; queue images for ML inference; human-in-the-loop escalation. |

### 2.7 Action tracking and task lists
| | |
|---|---|
| **Status** | Planned |
| **Priority** | High |
| **What** | Convert insights into tasks (irrigate, spray, sample) and track completion. |
| **Why** | Turns recommendations into measurable actions and outcomes. |
| **Implementation notes** | Task CRUD, reminders, share tasks with workers, attach photos and notes. |

### 2.8 Multi-field and portfolio views
| | |
|---|---|
| **Status** | Planned (basic field list exists) |
| **Priority** | High |
| **What** | Aggregate metrics across all fields (water use, alerts, risk) with filtering and grouping. |
| **Why** | Useful for larger farms and advisors. |
| **Implementation notes** | Dashboard with KPIs, exportable CSV summaries. |

### 2.9 Role-based access and advisor workflows
| | |
|---|---|
| **Status** | Planned |
| **Priority** | High |
| **What** | Farm owners, managers, agronomists, and extension agents with different permissions. |
| **Why** | Enables advisors to manage multiple farms and collaborate. |
| **Implementation notes** | Invite/accept flows, shareable read/write links, audit logs. |

### 2.10 Market & input price signals
| | |
|---|---|
| **Status** | Planned |
| **Priority** | Medium |
| **What** | Local market prices, input (seed/fertilizer) prices, and supplier contacts. |
| **Why** | Helps farmers make economic decisions tied to agronomic recommendations. |
| **Implementation notes** | Integrate regional price feeds or crowdsourced price reporting; show price trends. |

---

## 11. Data, models, and intelligence (differentiate & scale)

Invest in data quality, model performance, and explainability.

### 3.1 Improve field classifier and model ops
| | |
|---|---|
| **Status** | Partial — local versioning Live; CI / Artifact Registry Planned |
| **Priority** | Critical |
| **What** | Productionize EuroSAT model: retraining pipeline, model versioning, A/B testing, and fallback heuristics. |
| **Why** | Accurate field detection is foundational. |
| **Implementation** | Trainer writes `version`, accuracy/F1, `ml/models/versions/*`, and `registry.json`. Fallback `heuristic_v1` documented. Ops guide: [`ml/MODEL_OPS.md`](ml/MODEL_OPS.md). Next: CI + Artifact Registry + A/B routing in `classifyLocation`. |

### 3.2 Ensemble weather and satellite inputs
| | |
|---|---|
| **Status** | Partial — abstraction Live; extra providers Planned |
| **Priority** | High |
| **What** | Combine NASA POWER, GPM, ECMWF/other forecasts, and multiple satellite sources (SMAP, MODIS, Sentinel, Landsat). |
| **Why** | Redundancy and better accuracy across regions. |
| **Implementation** | `functions/lib/data-layer.js` normalizes POWER and stubs GPM/ECMWF/Sentinel/Landsat. Fusion provenance lists provider availability. Full wiring needs Blaze + API access/licensing. |

### 3.3 Local calibration and farmer feedback loop
| | |
|---|---|
| **Status** | Live (capture); training use Planned |
| **Priority** | High |
| **What** | Allow farmers to submit ground truth (yields, soil moisture) to calibrate models per region. |
| **Why** | Improves model relevance and trust. |
| **Implementation** | Field page feedback form → `users/{uid}/fields/{fieldId}/feedback/*` with consent flag. Firestore rules allow create/read by owner. Later: aggregate for regional calibration + incentives. |

### 3.4 Explainable AI and rule transparency
| | |
|---|---|
| **Status** | Live (UI + ruleTraces); full refresh needs Blaze |
| **Priority** | High |
| **What** | Show which rules/factors triggered a recommendation and allow toggling rule sensitivity. |
| **Why** | Farmers and advisors need to understand and trust automated advice. |
| **Implementation** | `fuseFieldInsight` emits `ruleTraces[]` (id, fired, condition, inputs, reason). Field UI lists triggered/quiet rules. Sensitivity slider (0.7–1.3×) saved locally and passed on refresh. |

### 3.5 Scenario simulation and what-if analysis
| | |
|---|---|
| **Status** | Live (heuristic simulator) |
| **Priority** | Medium |
| **What** | Simulate outcomes of actions (irrigate now vs later; apply X kg fertilizer) using simple crop models. |
| **Why** | Helps farmers weigh tradeoffs and costs. |
| **Implementation** | `js/scenario.js` + field **What-if** panel: effective water, deficit, stress, expected yield, cost. Uses latest insight metrics when available. |

### 3.6 Edge inference and mobile model deployment
| | |
|---|---|
| **Status** | Planned |
| **Priority** | Medium |
| **What** | Run lightweight models on device for instant classification (photos, field detection). |
| **Why** | Faster responses and offline capability. |
| **Implementation notes** | Convert models to TensorFlow Lite or ONNX; manage model updates. Documented under [`ml/MODEL_OPS.md`](ml/MODEL_OPS.md). |

---

## 12. Quick status matrix

| Feature | Status |
|---------|--------|
| Homepage + branding + hero video | Live |
| Sign in / Sign up (email + Google) | Live |
| My Profile + sign out | Live |
| Farmer dashboard | Live |
| Add / list / open / delete fields | Live |
| Leaflet map + my location | Live |
| Firestore security rules | Live |
| **2.1 Last-view / session restore** | **Live** |
| **2.2 Confidence + provenance UI** | **Live (data needs Blaze)** |
| **3.3 Farmer ground-truth feedback** | **Live** |
| **3.4 Rule traces + sensitivity** | **Live (data needs Blaze)** |
| **3.5 What-if scenarios** | **Live** |
| **3.1 Model versioning / registry** | **Partial (local)** |
| **3.2 Ensemble data layer** | **Partial (POWER + stubs)** |
| Map field classifier API | Paused |
| NASA POWER weather | Paused |
| Fusion insights (“Irrigate tomorrow”, etc.) | Paused |
| In-app alerts | Paused |
| Field trends + 7-day forecast charts | Paused |
| SMAP / MODIS Earthdata status | Paused |
| Python EuroSAT training / inference | Local-only |
| 2.3 Localization (language + units) | Planned |
| 2.4 SMS / WhatsApp / IVR | Planned |
| 2.5 Offline capture + sync | Planned |
| 2.6 Photo diagnostics / uploads | Planned |
| 2.7 Action tracking / tasks | Planned |
| 2.8 Multi-field portfolio views | Planned |
| 2.9 Role-based advisor workflows | Planned |
| 2.10 Market & input price signals | Planned |
| 3.6 Edge / TFLite / ONNX | Planned |
| HLS NDVI overlays | Not built yet |
| GPM realtime rainfall stream | Not built yet |
| Push notifications (FCM) | Not built yet |
| Swap production classifier to trained ML model | Not built yet |

---

## 13. What you can try right now

1. Open https://prithviscan.web.app  
2. Create an account / sign in  
3. Open the app → drop a pin on the map → save a field  
4. Open a field — try **What-if scenarios** and **Help improve recommendations**  
5. Use **Continue where you left off** after revisiting the dashboard  
6. On your PC (optional): run `ml\train_eurosat.bat` — check `ml/models/registry.json` for version/accuracy  

---

*This file is the product feature inventory for PrithviScan. Update it when major capabilities ship or change status.*
