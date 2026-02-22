Site Buddy (PWA) — Offline Audit MVP

Files:
- index.html
- sw.js
- manifest.webmanifest
- icon-192.png
- icon-512.png

IMPORTANT (Android camera):
- Live camera preview (getUserMedia) requires HTTPS.
- Use “Quick Capture” (system camera) if you are not on HTTPS.

Run locally (on your computer):
  python3 -m http.server 8080

For camera preview on Android, deploy to HTTPS (Netlify/GitHub Pages/etc.) or use an HTTPS local tunnel.
