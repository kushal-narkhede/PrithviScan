# PrithviScan — Suggested features after current sitemap

**Live site:** https://prithviscan.web.app  
**Current inventory:** [`FEATURES.md`](../FEATURES.md)  
**Audience:** PM / engineering handoff  
**Updated:** 2026-08-02

This document lists **practical next features** after what is already shipped. It merges ag-intelligence priorities (NDVI, alerts, VRA, offline) with weather/decision products (nowcasting, ET, spray windows) and maps them onto PrithviScan’s current stack (static app + Firestore + paused Cloud Functions + local ML/Ollama).

---

## 0. Already built (do not re-scope)

| Capability | Status | Notes for roadmap |
|------------|--------|-------------------|
| Homepage, auth, profile | Live | Org/individual signup |
| Fields CRUD + Leaflet map | Live | India-centered; CSV/GeoJSON I/O |
| Field detail tools | Live | What-if ROI (heuristic), feedback, print report |
| Price calculator | Live | GoI MSP, fertilizer bags, CHC hire |
| Info hub | Live | Fertilizers, soils, crops, machines, maintenance |
| Organizations | Live | Owner invites members by email |
| Collaborate | Live | Friends, chat, field share |
| Ask AI widget | Live (client) | Ollama local + Gemini/OpenRouter ready |
| NASA fusion / alerts APIs | **Live** | Blaze Functions + `EARTHDATA_TOKEN` in Secret Manager |
| Ask AI `aiChat` API | **Live** | Set real `GEMINI_API_KEY` / `OPENROUTER_API_KEY` when ready |
| EuroSAT classifier | Local train | `classifyLocation` live (heuristic); upload model later |

**Blaze enablement (done):** Functions deployed; `FUNCTIONS_ENABLED = true`. Next product work starts at H1.

---

## 1. High priority — core value & retention

| # | Feature | Why it matters | Implementation notes (PrithviScan) | Builds on |
|---|---------|----------------|--------------------------------------|-----------|
| H1 | **Automated Field Health Index (NDVI/EVI)** | Instant visual stress map; “wow” moment on field open | Ingest HLS/Sentinel (or Earthdata CMR already stubbed); compute NDVI tiles server-side; Leaflet heatmap / raster overlay on `field.html` + `/app` | `fieldEarthSummary`, CMR helpers, map layer |
| H2 | **Change detection / time-series** | Trends beat single snapshots | Store dated imagery/index snapshots under `users/{uid}/fields/{id}/snapshots`; swipe or scrub timeline; flag ΔNDVI > threshold | Existing snapshots subcollection pattern |
| H3 | **Actionable alerts (threshold + push/email/SMS)** | Insight → action; drives retention | User thresholds (NDVI drop, moisture, heat); extend paused `getAlerts`; add FCM push; email via provider; SMS later (Twilio) | Alerts UI already on `/app`; quiet hours prefs live |
| H4 | **Field-level prescriptions (VRA maps)** | Links insight to seed/fertilizer/pesticide | Generate zone polygons + rates; export GeoTIFF / CSV / GeoJSON from field page; store `prescriptions/{id}` | Import-export + org workflows |
| H5 | **Mobile offline mode + sync** | Critical in low-connectivity farms | Service worker: cache app shell, last map tiles, last insight; queue field/photo uploads; sync on reconnect | Static hosting friendly; start with “read-last-insight offline” |

**High-priority acceptance criteria (shared)**
- Works for an org with multiple fields  
- Provenance on every product (source, timestamp, model/version)  
- Respects org membership rules already in Firestore  

---

## 2. Medium priority — differentiators & workflow

| # | Feature | Why it matters | Implementation notes |
|---|---------|----------------|----------------------|
| M1 | **Multi-sensor fusion** | Better accuracy than single source | Fuse satellite + optional drone upload + IoT soil moisture + POWER weather; confidence-weighted fusion in Functions | Extend `fuseFieldInsight` |
| M2 | **What-if ROI simulator (stronger)** | Planning decisions with money attached | Upgrade current heuristic scenario UI: fertilizer dose, irrigation mm, price from MSP calculator; sensitivity sliders + ₹ impact | `js/scenario.js` + `/prices` rates |
| M3 | **Automated scouting checklist + photo tagging** | Ground truth loop | Upload photo → geotag + time; lightweight classifier (reuse EuroSAT / pest head); checklist per crop template | Feedback collection already exists |
| M4 | **Task & crew management** | Orgs need ops, not just maps | Assign spray/scout/harvest jobs to org members; map pin + checklist + done state | `/org` membership + Collaborate |
| M5 | **Machinery / ISOBUS exports** | Close the loop to applicators | Export prescription as ISOXML / shapefile / CSV “ready for terminal”; document Agrirouter later | Depends on H4 |

---

## 3. Weather & ag decision products (strategic layer)

These are “Tomorrow.io–class” capabilities. Sequence after H1–H3 unless a weather partnership lands first.

| # | Feature | Notes |
|---|---------|-------|
| W1 | **Hyperlocal multi-timescale forecasts** | Hourly 0–72h field-scale first (POWER + downscaling); minute-level nowcasts only with radar partner |
| W2 | **Nowcast + event detection** | Frost, heavy rain, high wind, hail probability; group by field/crop/task; reuse quiet hours |
| W3 | **Irrigation / ET engine** | Crop-stage ET, soil deficit, pump runtime suggestion |
| W4 | **Spray drift & wetness windows** | Wind + humidity + leaf wetness → safe spray times |
| W5 | **Frost mitigation planner** | Risk windows + mitigation actions + rough cost |

**Pitch line:** *Turn satellite and field data into immediate, actionable prescriptions — spot stress early, assign work, and export variable-rate maps for direct application.*

---

## 4. Lower priority — advanced analytics & long-term value

| # | Feature | Notes |
|---|---------|-------|
| L1 | Yield forecasting (ML + intervals) | Historical yield + weather + NDVI; show confidence bands |
| L2 | Disease/pest early-warning | Regional risk from weather + imagery + reports |
| L3 | Soil health dashboard | Lab CSV upload; pH / OM / compaction over time |
| L4 | Carbon / sustainability reports | Sequestration + fertilizer emissions; export for buyers |
| L5 | On-demand drone tasking | Trigger flight for high-risk fields; auto-ingest |
| L6 | Third-party data marketplace | Stations, labs, pest reports, prices |
| L7 | Edge inference / tractor runtime | ONNX small models offline (after VRA + offline sync) |
| L8 | Enterprise SLAs + tiered APIs | After Partner API is live on Blaze |

---

## 5. UX / product polish (parallel track — smaller slices)

| # | Feature | Notes |
|---|---------|-------|
| U1 | Guided org/field onboarding 2.0 | Boundary drawing + sample NDVI walkthrough (beyond current tour) |
| U2 | Custom dashboards & saved views | Pin fields, metrics, date ranges |
| U3 | Role-based access + audit logs | owner / agronomist / scout / viewer (extend org roles) |
| U4 | Crop/region templates | Preloaded thresholds for wheat, paddy, maize, … |
| U5 | In-app decision guides | Short NDVI/moisture guides (extend `/info`) |
| U6 | Action center | Prioritized tasks with one-click export + crew assign |
| U7 | Collaborative annotations | Pins + photos on field (extend Collaborate) |

---

## 6. Data, privacy, trust (non-negotiable constraints)

| Rule | Requirement |
|------|-------------|
| Training vs production | User data for model training only with **opt-in** + anonymization (prefs already started) |
| Per-org partitioning | Enforce via Firestore rules (orgs exist; tighten field sharing next) |
| Export provenance | Every export includes source, sensor, timestamp, model version |
| Compliance | GDPR/CCPA-minded retention; region-specific ag data rules as you expand |

---

## 7. Suggested release sequence (no calendar estimates)

Phasing by **dependency and value**, not weeks.

### Release A — “See stress, get alerted”
**Scope:** H1 NDVI/EVI overlay · H2 basic time-series · H3 threshold alerts (in-app + email; push if feasible) · U1 onboarding polish · Blaze Functions live  
**Depends on:** Earthdata/HLS (or Sentinel) pipeline, snapshot storage, alert prefs  
**Exit criteria:** User opens a field → sees health map → gets alert when index drops  

### Release B — “Act and assign”
**Scope:** H4 prescription export · M4 tasks/crew · M3 photo scouting · H5 offline read-cache · M2 stronger ROI tied to `/prices`  
**Depends on:** Release A indices stable  
**Exit criteria:** Org owner exports a VRA CSV/GeoJSON and assigns a spray task  

### Release C — “Decide with weather + machines”
**Scope:** W1–W4 (hourly + ET + spray/frost windows) · M1 multi-sensor fusion · M5 ISOBUS/ISOXML · L1 yield forecast MVP  
**Depends on:** Weather partner or POWER downscaling; prescription schema frozen  
**Exit criteria:** Field page shows spray window + irrigation suggestion with provenance  

### Release D — “Platform & enterprise”
**Scope:** L2–L4, L6 marketplace, L7 edge, L8 APIs/SLAs, U2–U3 roles/audit, monetization tiers  
**Depends on:** Stable A–C product surface and billing decision  

---

## 8. KPIs to track

| KPI | Why |
|-----|-----|
| % fields with ≥1 health index in last 14 days | Core engagement |
| Alert precision / opt-out rate | Avoid fatigue |
| VRA export rate per active org | Action loop |
| Offline session → successful sync | Connectivity resilience |
| Forecast skill vs baseline (when W1 ships) | Weather product quality |
| Org seat activation (invited → active) | Org product fit |
| Ask AI → resolved without support | Self-serve deflection |

---

## 9. Engineering checklist (parity targets)

Use as a backlog hygiene list, not a promise of scope:

- [ ] Low-latency field index tiles + caching  
- [ ] Historical snapshots + change thresholds  
- [ ] Alert engine with quiet hours / escalation (prefs exist)  
- [ ] VRA exports (GeoTIFF/CSV/ISOXML path)  
- [ ] Offline shell + queued writes  
- [ ] Provenance on every insight/export  
- [ ] Org RBAC beyond owner/member  
- [ ] Model registry + drift checks (extend `ml/MODEL_OPS.md`)  
- [ ] Partner/enterprise API after Blaze (`docs/PARTNER_API.md`)  
- [ ] SDKs/webhooks only after streaming alerts exist  

---

## 10. What to do next (immediate engineering order)

1. **Unblock Blaze + deploy Functions** — otherwise H1–H3 stay mockups.  
2. **Ship H1 NDVI overlay** on one field (India tile path).  
3. **Wire H3 alerts** into existing Alerts tab + email.  
4. **H2 timeline** from stored snapshots.  
5. **H4 CSV prescription** export (ISOBUS later).  
6. Keep Ask AI / Prices / Info as education rails beside the map products.

---

*When a feature ships, move it into [`FEATURES.md`](../FEATURES.md) and tick the checklist here.*
