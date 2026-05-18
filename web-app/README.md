# Cloud Notes Frontend (web-app)

Simple React + Vite + TypeScript frontend for the Cloud Notes API.

Quick start (requires Node.js >=16):

```bash
cd web-app
npm install
npm run dev
```

The dev server proxies `/api`, `/login`, `/register` to `http://127.0.0.1:8080` (see `vite.config.ts`).

Build for production:

```bash
npm run build
# serve dist with a static server
npx serve dist
```

Notes:
- This is a minimal scaffold to help local testing and future migration to a PWA/mobile flow.
- After building, you can copy `dist` to backend `web/` folder for static hosting behind your Go server or set up a reverse proxy.
