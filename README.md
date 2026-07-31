# PrithviScan

PrithviScan is an Earth‑intelligence platform that uses satellite imagery to help farmers understand their land with clarity and precision. It blends Sanskrit heritage with modern technology to deliver real‑time insights for healthier crops and smarter decisions.

## Preview locally

```bash
python3 -m http.server 8000
# marketing: http://localhost:8000
# farmer app: http://localhost:8000/app.html (requires sign-in)
```

## Farmer app (Days 1–3 done)

After sign-in you land on **`app.html`**:
- Add a field by clicking the **Leaflet/OSM map** (or Use my location)
- Fields saved under Firestore `users/{uid}/fields/{fieldId}`
- Open a field → `field.html?id=...`

Deploy rules once Firestore is enabled in the console:

```bash
firebase deploy --only firestore:rules,hosting
```

The hero uses `assets/hero-canopy.mp4` (muted autoplay loop).

## Deploy to Firebase Hosting

From the branch that has the homepage:

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc
# edit .firebaserc and set your Firebase project id
firebase deploy --only hosting
```

Your site will be live at `https://prithviscan.web.app`.

## Enable login (Google + email/password)

1. Firebase Console → **Authentication** → **Get started**
2. Enable **Email/Password** and **Google**
3. Project settings → **Your apps** → add a **Web** app
4. Copy `apiKey` and `appId` into `js/firebase-config.js`
5. Under Authentication → Settings → **Authorized domains**, keep:
   - `localhost`
   - `prithviscan.web.app`
   - `prithviscan.firebaseapp.com`
6. Redeploy hosting after saving the config

## Earthdata token (Firebase Secret — server only)

**Never put the Earthdata token in `js/` or any public hosting file.**  
Browsers would expose it to every visitor.

1. Save locally (gitignored):
```bash
mkdir -p .secrets
cp .env.example .secrets/earthdata.env
# paste your real token into EARTHDATA_TOKEN=...
```

2. Upload to Firebase Secret Manager (run on your machine while logged in):
```bash
firebase login
firebase functions:secrets:set EARTHDATA_TOKEN
# paste the token when prompted, then Enter, then Ctrl+D
```

3. Install + deploy functions:
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

4. Test:
- `https://us-central1-prithviscan.cloudfunctions.net/earthdataStatus`
- `https://us-central1-prithviscan.cloudfunctions.net/cmrSearch`
