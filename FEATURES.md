# PrithviScan — Feature sheet (what’s built today)

**Live site:** https://prithviscan.web.app  
**Firebase project:** `prithviscan`  
**Repo branch:** `cursor/homepage-hero-ffb2`  
**Updated:** 2026-08-02

**Status key**
| Status | Meaning |
|--------|---------|
| **Live** | On the deployed site now (Spark plan) |
| **Paused** | Coded; needs Firebase **Blaze** + Cloud Functions deploy |
| **Local** | Runs on your PC (Ollama / Python ML); not hosted by Firebase |
| **Planned** | Roadmap only — not built |

---

## A. Quick matrix — currently built

| Area | Status | Where |
|------|--------|--------|
| Marketing homepage (canopy hero) | Live | `/` |
| Auth (email + Google) | Live | `/auth` |
| Org / individual signup | Live | `/auth` (create account) |
| My profile + prefs | Live | `/profile` |
| Farmer dashboard (fields + map) | Live | `/app` |
| Field detail + tools | Live | `/field?id=…` |
| Price calculator (MSP / fertilizer / CHC) | Live | `/prices` |
| Info hub (fertilizers, soils, crops, machines, maintenance) | Live | `/info` |
| Organizations (owner adds members) | Live | `/org` |
| Collaborate (friends, chat, field share) | Live | `/collab` |
| Ask AI floating chatbot | Live (client) | Bottom-right on **all pages** |
| Ask AI → Ollama | Local | Needs CORS / proxy on your PC |
| Ask AI → Gemini / OpenRouter | Live (ready) | Settings → paste API key |
| Partners + privacy pages | Live | `/partners`, `/privacy` |
| Onboarding + demo field | Live | First visit on `/app` |
| CSV / GeoJSON import-export | Live | `/app` |
| What-if ROI / yield calculator | Live | Field page |
| Printable field report | Live | Field page |
| Accessibility + alert quiet hours | Live | Profile settings |
| NASA fusion / alerts / trends APIs | **Live** | Blaze Functions deployed |
| Cloud Function `aiChat` (server keys) | **Live** | Secrets in Secret Manager (set real Gemini/OpenRouter keys) |
| Trained EuroSAT classifier in prod | Partial | `classifyLocation` live (heuristic); local EuroSAT model not uploaded |

---

## 1. Marketing homepage — Live

**URL:** https://prithviscan.web.app  
**Files:** `index.html`, `styles.css`, `script.js`, `assets/`

| Feature | Detail |
|---------|--------|
| Brand-first hero | Full-bleed canopy video; **PrithviScan** as hero-level brand |
| Hero content | One headline, one support line, CTA group |
| Top nav | Data, Intelligence, How it works, Organization (+ auth slot). **No** Info / Prices / Collaborate on homepage |
| Auth-aware nav | Signed out → Get started; signed in → Open app + person menu |
| Sections | NASA data rail, intelligence, how-it-works pipeline, insights |
| Motion | Scroll header, reveal-on-scroll, hero video |
| Design | Forest palette, Fraunces + Figtree, responsive |

---

## 2. Authentication — Live

**URL:** `/auth`  
**Files:** `auth.html`, `auth.css`, `js/auth.js`, `js/auth-page.js`

| Feature | Detail |
|---------|--------|
| Email / password | Sign in + create account |
| Google sign-in | Popup; redirect fallback |
| Display name | On signup |
| **Account type** | **Organization / farm group** (default) or **Individual farmer** |
| **Organization name** | Required when creating an org account; owner is created automatically |
| Invite claim | Pending org invites applied after signup |
| Friendly errors | Readable Firebase error messages |
| Post-signup | Org accounts → `/org`; others → `/app` |

---

## 3. My profile — Live

**URL:** `/profile`  
**Files:** `profile.html`, `js/profile-page.js`, prefs helpers

| Feature | Detail |
|---------|--------|
| Account card | Name, email, provider, member since |
| Accessibility prefs | Larger text / simpler modes (client) |
| Data ownership opt-in | Consent flags |
| Alert quiet hours / snooze | Client prefs for when alerts are quiet |
| Sign out | Returns to homepage |

---

## 4. Farmer dashboard — Live (alerts API paused)

**URL:** `/app`  
**Files:** `app.html`, `app.css`, `js/app.js`, `js/fields.js`, `js/map.js`

### Fields (Live)
| Feature | Detail |
|---------|--------|
| Auth-gated dashboard | Must be signed in |
| Field cards | Name, coords, crop, last insight badge |
| Add field | Name, crop, lat/lon |
| Leaflet map | Click / drag marker (India default) |
| My location | Browser geolocation |
| Save to Firestore | `users/{uid}/fields/{fieldId}` |
| Continue session | Jump back to last field |
| Import / export | CSV + GeoJSON bulk tools |
| Onboarding tour | Demo field on first visit |

### Alerts tab (Paused until Blaze)
| Feature | Detail |
|---------|--------|
| UI shell | List, unread badge, mark read |
| Spark behavior | Clear “needs Cloud Functions” message |

**App top nav (non-home):** Home · Fields · Alerts · **Prices** · Organization · Info · Collaborate · account

---

## 5. Field detail — Live shell; NASA refresh paused

**URL:** `/field?id=…`  
**Files:** `field.html`, `js/field-page.js`, `js/scenario.js`, `js/feedback.js`, `js/safety.js`

| Feature | Detail | Status |
|---------|--------|--------|
| Field header + map pin | Name, crop, coords | Live |
| Cached insight display | Last saved insight if any | Live |
| Confidence / provenance UI | Shows when data exists | Live |
| Rule traces + sensitivity | UI ready | Live UI / data needs Blaze |
| What-if ROI / yield calculator | Heuristic scenario tools | Live |
| Ground-truth feedback | Farmer feedback capture | Live |
| Safety confirmations | High-risk action checks | Live |
| Print / save report | Browser print report | Live |
| Refresh NASA fusion | `fuseFieldInsight` | Paused |
| Trends / forecast charts | POWER trends | Paused |
| Delete field | Removes field | Live |

---

## 6. Price calculator — Live

**URL:** `/prices`  
**Files:** `prices.html`, `prices.css`, `js/prices-page.js`, `js/market-prices.js`

| Tab | What it uses |
|-----|----------------|
| Crop returns | **Government of India MSP** (₹/quintal) × yield × acres |
| Fertilizer cost | **Notified bag retail prices** (urea, DAP, NPK, nano urea, …) |
| Machine hire | **Indicative CHC rates** (tractor, rotavator, combine, laser leveler, …) |
| Rate sheet | Full reference tables + source notes |

Selected category tabs use a **solid green** active state. Rates are market/notified references — **not random**.

---

## 7. Farm knowledge hub (Info) — Live

**URL:** `/info`  
**Files:** `info.html`, `info.css`, `js/info-data.js`, `js/info-page.js`

| Category | Examples |
|----------|----------|
| Fertilizers | Urea, DAP, MOP, NPK blends, … |
| Soil amendments | Gypsum, lime, neem cake, … |
| Soil types | Clay, sandy, loam, black cotton, … |
| Crops | Wheat, paddy, maize, pulses, … |
| **Machines & tractors** | 35–50 HP tractor, rotavator, seed drill, combine, laser leveler, thresher, sprayer, pumpset |
| **Maintenance** | Seasonal tractor service, blades/tines, sprayer care, pump/irrigation, post-harvest hygiene |
| Farm inputs | Biofertilizer, mulch, … |

Also: search, category chips, detail panels (pros/cons/tips), **“What grows on my soil?”** matcher.

---

## 8. Organizations — Live

**URL:** `/org`  
**Files:** `org.html`, `org.css`, `js/org.js`, `js/org-page.js`  
**Rules:** `firestore.rules` → `organizations`, `orgInvites`

| Feature | Detail |
|---------|--------|
| Create org | On signup or from Organization page |
| Owner role | Creator is owner |
| Add by email | Existing users join immediately |
| Pending invite | Unknown emails invited; claim on signup |
| Member list | Names, emails, roles |
| Remove member | Owner can remove (not themselves) |
| Why | Individual farmers are rare — FPOs / family / teams |

---

## 9. Collaborate — Live

**URL:** `/collab`  
**Files:** `collab.html`, `collab.css`, `js/collab.js`, `js/collab-page.js`

| Feature | Detail |
|---------|--------|
| Friend requests | By email lookup on public profiles |
| Accept / decline | Request inbox |
| 1:1 + group chat | Firestore conversations + messages |
| Share fields | Share field location/notes with friends |

---

## 10. Ask AI chatbot — Live (floating widget)

**UI:** Green bubble, **bottom-right on every page** (`js/ai-widget.js`, `ai-widget.css`)  
**Loaded via:** `js/nav-auth.js` (and auth/privacy/partners)

| Feature | Detail |
|---------|--------|
| Always visible | FAB on homepage, app, prices, info, org, collab, auth, … |
| Chat panel | Messages, send, clear, settings |
| History | Saved in `localStorage` |
| System persona | India farm advisor (crops, MSP, machines, soils) |
| **Ollama (default)** | `http://127.0.0.1:11434` — **Local**; needs CORS |
| Ollama CORS help | `scripts/start-ollama-for-web.ps1` / `.sh` |
| Ollama CORS proxy | `node scripts/ollama-cors-proxy.mjs` → use `http://127.0.0.1:11435` |
| Test Ollama | Settings → Test Ollama diagnostics |
| **Gemini** | Ready in Settings (API key in browser for testing) |
| **OpenRouter** | Ready in Settings (API key in browser for testing) |
| Server proxy | `functions/lib/ai-chat.js` + `exports.aiChat` — **Paused** until Blaze |

**Ollama note:** The live HTTPS site cannot talk to local Ollama until you set `OLLAMA_ORIGINS` or run the CORS proxy on your PC.

---

## 11. Account menu (all signed-in pages) — Live

Person icon → dropdown: Home · My profile · Organization · Price calculator · Collaborate · Settings · Sign out  
**Open app** button when not already on an app page.

---

## 12. Cloud Functions (backend) — Live (Blaze)

**Files:** `functions/index.js`, `functions/lib/*`  
**Gate:** `FUNCTIONS_ENABLED = true` in `js/api.js`  
**Base:** `https://us-central1-prithviscan.cloudfunctions.net`

| Function | Purpose |
|----------|---------|
| `powerSummary` | NASA POWER weather summary |
| `fuseFieldInsight` | Fusion rules → field recommendation |
| `fieldEarthSummary` | Earthdata / related summary |
| `fieldTrends` | Rain/temp trends |
| `getAlerts` / `markAlertRead` | Alert feed |
| `classifyLocation` | Field-vs-not-field heuristic / vision hook |
| `aiChat` | Server-side Gemini / OpenRouter / Ollama proxy |
| `earthdataStatus` / `cmrSearch` | Earthdata token / granule search |

**Secret Manager:** `EARTHDATA_TOKEN` (real), `GEMINI_API_KEY` + `OPENROUTER_API_KEY` (placeholders — replace with real keys).

---

## 13. Python ML toolkit — Local

**Folder:** `ml/`

| Piece | Detail |
|-------|--------|
| EuroSAT classifier training | `ml/train_field_classifier.py`, `ml/train_eurosat.bat` |
| Local model artifact | `ml/models/field_classifier.joblib` (trained on your PC; ~87% reported) |
| Not in production yet | App still uses Node heuristic when Functions exist; Functions not deployed |
| Datasets / ops docs | `ml/DATASETS.md`, `ml/MODEL_OPS.md` |

Do **not** upload the EuroSAT dataset into the repo.

---

## 14. Data model (Firestore) — Live rules

| Collection | Purpose |
|------------|---------|
| `profiles/{uid}` | Public discoverable profile (email lookup) |
| `users/{uid}` | Private user meta (accountType, orgId, orgRole) |
| `users/{uid}/fields/{id}` | Fields + nested snapshots / insights / feedback |
| `users/{uid}/friends/{id}` | Friend links |
| `friendRequests` | Pending friend requests |
| `conversations` + `messages` | Collab chat |
| `fieldShares` | Shared fields |
| `organizations` | Org name, owner, memberIds, pendingEmails |
| `orgInvites` | Pending org email invites |

---

## 15. Infra

| Piece | Status |
|-------|--------|
| Firebase Hosting | Live — https://prithviscan.web.app |
| Firestore rules + indexes | Live (incl. orgs / invites) |
| Auth Email + Google | Live (must be enabled in Console) |
| HTML cache | `must-revalidate` (faster nav updates) |
| Cloud Functions | **Live** (Blaze) |
| Secrets | `EARTHDATA_TOKEN`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` in Secret Manager |

---

## 16. Partner & trust pages — Live

| Page | Content |
|------|---------|
| `/partners` | Extension / co-op partnership overview |
| `/privacy` | Data ownership notes |
| `/docs/PARTNER_API.md` | Partner API contract (endpoints need Blaze) |

---

## 17. What you can try right now

1. https://prithviscan.web.app — homepage  
2. Create account as **Organization** → add teammates on `/org`  
3. `/app` — add fields on the map; import/export CSV  
4. `/prices` — MSP crop returns, fertilizer bags, machine hire  
5. `/info` — search tractor, urea, clay soil  
6. `/collab` — friend + chat  
7. **Ask AI** bubble (bottom-right) — Ollama locally with CORS, or Gemini/OpenRouter keys  
8. Open a field → what-if ROI, feedback, print report  

---

## 18. Follow-ups after Blaze enablement

- Replace placeholder `GEMINI_API_KEY` / `OPENROUTER_API_KEY` with real keys  
- Upload trained EuroSAT model into Functions vision path  
- Partner API live endpoints / docs polish  
- Upgrade Functions runtime from Node 20 before Oct 2026 decommission  

---

## 19. Planned (not built)

SMS/WhatsApp alerts, offline mode, multi-language pack, referral program, full partner portal, advanced disease models, marketplace listings — see older roadmap sections in git history if needed.

---

**Next features (prioritized):** see [`docs/ROADMAP.md`](docs/ROADMAP.md).

*This sheet reflects the product as deployed on Spark hosting. Flip `FUNCTIONS_ENABLED` and deploy Functions after upgrading to Blaze.*
