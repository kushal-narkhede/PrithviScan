# PrithviScan

PrithviScan is an Earth‑intelligence platform that uses satellite imagery to help farmers understand their land with clarity and precision. It blends Sanskrit heritage with modern technology to deliver real‑time insights for healthier crops and smarter decisions.

## Preview the homepage

Open `index.html` in your browser, or run a simple HTTP server from the project root:

```bash
python -m http.server 8000
# then open http://localhost:8000
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

Your site will be live at `https://<project-id>.web.app`.
