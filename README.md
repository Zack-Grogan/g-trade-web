# g-trade-web

Next.js internal UI for analytics. Calls analytics API only; single-operator auth. Part of the G-Trade Railway project; see [Architecture overview](https://github.com/Zack-Grogan/G-Trade/blob/main/docs/Architecture-Overview.md) for the full architecture.

Deployed service names may still be `grogan-trade-web` until renamed in Railway.

- **Env:** `NEXT_PUBLIC_ANALYTICS_API_URL` or server-side `ANALYTICS_API_URL`, `ANALYTICS_API_KEY`
- Deploy after ingest and analytics are stable.
