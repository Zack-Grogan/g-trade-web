# g-trade-web

Next.js internal UI for analytics. Calls analytics API only; single-operator auth. Part of the G-Trade Railway project; see [Architecture overview](https://github.com/Zack-Grogan/G-Trade/blob/main/docs/Architecture-Overview.md) for the full architecture.

**Package manager:** Bun. Install and run:

```bash
bun install
bun run dev    # local
bun run build
bun run start  # production
```

On Railway, set build command to `bun install --frozen-lockfile && bun run build` and start command to `bun run start` (or use Nixpacks/Railpack with Bun detected).

- **Env:** `NEXT_PUBLIC_ANALYTICS_API_URL` or server-side `ANALYTICS_API_URL`, `ANALYTICS_API_KEY`. For auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (Clerk keyless mode works without them for local dev; set in production).
- Deploy after ingest and analytics are stable.
