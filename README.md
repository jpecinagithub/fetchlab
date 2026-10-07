# FetchLab — Browser REST API Client

A lightweight, beautiful REST API client inspired by Thunder Client / Postman, focused on
simplicity, speed and learning. **100% browser-based: no backend, no accounts, no database.**

- Compose and send HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) with the
  browser's native `fetch()` — `Ctrl`/`Cmd` + `Enter` to send, `AbortController` to cancel
- Query params synced both ways with the URL, headers editor with autocomplete,
  Bearer / Basic / API-key auth, JSON (highlighted) / Text / Form / URL-encoded bodies
- Response viewer with status · time · size metrics, collapsible searchable JSON tree,
  headers and raw tabs — HTML is shown as source and never executed
- **History:** the last 50 *HTTP 200* responses only, persisted in IndexedDB, with secrets
  (`Authorization`, `Cookie`, `X-API-Key`, …) redacted as `[REDACTED]` before storage
- cURL import / export, request timeouts, friendly CORS / network / timeout error messages
- 5 verified example requests (JSONPlaceholder, DummyJSON, httpbin) for first use
- Light / Dark / System themes, EN/ES (EN default), responsive mobile layout, PWA installable

## Privacy

- Requests execute directly from your browser to the target API. There is no proxy server.
- History lives only in your browser's IndexedDB. Credentials are never written to history.
- Vercel Analytics is included for page views only — URLs, headers, bodies and API keys are
  never sent to analytics.

## Develop

```bash
npm install
npm run dev
npm run build
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** this repository (framework preset: Vite).
3. Deploy. To enable analytics, open the project → **Analytics** tab → **Enable**.

---

Built by Jon Peciña — jpecina@gmail.com
