# India localization — Bhuvan, Bhoonidhi & other layers

PrithviScan’s global stack stays **NASA POWER / Earthdata + Tomorrow.io**.  
For Indian fields we add a localization pack:

| Provider | What you get | Secret | How to get it |
|----------|--------------|--------|----------------|
| **Bhuvan (ISRO/NRSC)** | Village reverse-geocode, LULC 250K AOI stats, WMS overlays on the field map | `BHUVAN_API_TOKEN` | https://bhuvan-app1.nrsc.gov.in/api/ → generate Access Token |
| **Bhoonidhi** | ISRO / IRS scene search near the field | `BHOONIDHI_TOKEN` **or** `BHOONIDHI_USER` + `BHOONIDHI_PASSWORD` | https://bhoonidhi.nrsc.gov.in — email **bhoonidhi@nrsc.gov.in** for API access |
| **IMD** | District / city forecast, rainfall, warnings | `IMD_API_KEY` | https://api.imd.gov.in → Create Account |
| **Agmarknet (data.gov.in)** | Live mandi modal prices | `DATA_GOV_IN_API_KEY` | https://data.gov.in → My Account → API Keys |
| **Agro-climatic soil proxy** | Zone, soils, monsoon, typical crops | *(none)* | Built-in NBSS-style zones |
| **Schemes** | PM-KISAN, PMFBY, SHC, KCC, eNAM, PMKSY tips | *(none)* | Built-in copy |

## Set secrets

```bash
# 1) Create .secrets/india.env (gitignored) with any keys you have:
# BHUVAN_API_TOKEN=...
# BHOONIDHI_TOKEN=...
# BHOONIDHI_USER=...
# BHOONIDHI_PASSWORD=...
# IMD_API_KEY=...
# DATA_GOV_IN_API_KEY=...

bash scripts/set-india-secrets.sh

# 2) Redeploy functions
npx firebase-tools deploy --only functions --project prithviscan
```

Check status (no auth):  
`https://us-central1-prithviscan.cloudfunctions.net/indiaLayersStatus`

## In the app

Open an **India** field → **India layers** tool.  
**Markets** also shows a live Agmarknet card when `DATA_GOV_IN_API_KEY` is set.  
Location map gets Bhuvan WMS overlays (toggle in Leaflet layers control).

Missing keys soft-fail: the panel still shows agro-climatic soil + schemes, and NASA/Tomorrow keep working.
