# g-trade-web

Internal operator console for the G-Trade Railway project. The app is Clerk-authenticated and read-only from an execution standpoint: it investigates runs, bridge health, and persisted AI artifacts, but it does not control the trader.

## Surfaces

- `GET /` - operator console for run/bridge/log investigation and advisory chat
- `GET /runs` - latest run index
- `GET /runs/[runId]` - run detail with timeline, bridge health, and order lifecycle
- `GET /rlm` - RLM lineage explorer
- `GET /reports` - persisted report index
- `GET /reports/[reportId]` - persisted report detail
- `POST /api/operator` - server-side advisory analysis trigger for the chat UI

## Env

- `ANALYTICS_API_URL`
- `ANALYTICS_API_KEY`
- `RLM_SERVICE_URL` for direct report / hypothesis generation from the chat UI
- `RLM_AUTH_TOKEN` for the RLM service when direct generation is enabled

All backend access stays on the server. No service tokens are exposed to the browser.

## Build

```bash
bun run build
bun run lint
```
