Student Progress App - Minimal Prototype
----------------------------------------

This archive contains a minimal prototype with:
  - backend/ : Node.js + Express server (simple storage to cases.json)
  - frontend/: Vite + React prototype (offline saving to IndexedDB + simple sync)

How to run:

1) Backend
   cd backend
   npm install
   npm start
   The backend listens on port 5000 by default.

2) Frontend
   cd frontend
   npm install
   npm run dev
   The frontend dev server runs on port 3000 (Vite). Open http://localhost:3000

Notes:
- Login is mocked: use student@example.com or teacher@example.com
- When offline, adding a case saves it to IndexedDB. When back online, click "Force Sync" to push offline cases to the backend (or reload while online).
- Service worker (sw.js) is included; it registers after build/preview. Vite dev server may not serve sw in development; use build+preview for PWA caching behavior.

If you want further features (QR validation, file uploads, avatar/gamification), tell me which ones and I'll extend the prototype.
