# Deploy current branch hosting to Firebase (Windows PowerShell)
# Run from repo root after: git checkout cursor/homepage-hero-ffb2; git pull
npx --yes firebase-tools login
npx --yes firebase-tools deploy --only hosting --project prithviscan
