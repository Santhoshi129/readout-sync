# TWU · The Readout: Systems Dashboard

Internal operations dashboard for the Train With Us / Blended Athletics automation stack. Two dashboards in one app:

- **Owner Outreach Intelligence** (`/gym-owners`): the Train With Us gym owner reach out system. Cold gyms scraped, scored, drafted, and worked through email, Instagram, and phone.
- **Member Adoption Pulse** (`/members`): the Blended Athletics member reach out system. Existing members identified and invited onto the TWU app.

Every metric is live-derived. Nothing is hardcoded; where a number isn't instrumented yet, the UI says so rather than faking it.

## Data architecture (v2, crash-proof)

The old design ran the full GHL + Sheets + Mongo fetch on every page load, which crashed n8n under concurrent loads. The v2 design:

1. n8n workflow **TWU Readout Cache Sync** runs every 5 minutes (or on demand via `/twu-readout-sync-now`) and stores compact aggregate documents in MongoDB (`readout_cache_v2`).
2. n8n workflow **TWU Readout Serve Cached** exposes `/twu-readout-leadgen-v2` and `/twu-readout-appadoption-v2`, which read only those documents. A few KB, instant, no heavy fetch on any page load.
3. This app reads the v2 endpoints (`cache: no-store`) and falls back to the legacy direct endpoints automatically if the cache is empty, so migration has zero downtime.
4. The top bar's **Refresh now** button triggers the sync on demand and re-renders when fresh numbers land, so data is at most 5 minutes old and one click from real-time.

Import files and setup steps live in `../n8n-workflows/`.

## What's inside

- **Overview** (`/`): pick a system; headline stats for both.
- **Dashboards** (`/gym-owners`, `/members`): briefing, headline stats, live pipeline stage map, funnels, channel and reply breakdowns, CrossFit vs HYROX comparison, top locations, diagnostics, an interactive searchable tag glossary, and the flow grid.
- **Flow drilldown** (`/flows/[slug]`): per flow: Business/Technical analysis toggle, live report and charts, health checks, changelog, and the tags it applies.

## Design

Matches the TWU app: pure black `#000`, amber `#C9A84C`, `#141414`/`#1a1a1a` cards, circular progress rings, gradient funnel bars. Desktop layout.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

`.env.local`:

| var | what it is |
|---|---|
| `READOUT_BASE_URL` | base URL of the n8n webhook root (default already points at the live one) |
| `DASHBOARD_PASSWORD` | shared password (only if the password gate middleware is present) |
| `SESSION_SECRET` | random string signing the session cookie (only with the gate) |

Note: this copy of the repo does not include `middleware.ts`; the password gate described in earlier versions is not active. Add it back before exposing the deployment publicly.

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (auto-detected as Next.js).
2. Add the env vars in Project > Settings > Environment Variables.
3. Deploy.

## Data contract

`lib/readout.ts` types the payload and does the v2-with-fallback fetch. `lib/flows.ts` is the registry: each flow declares its analysis, go-live date, changelog, health canaries, tag notes, and the dot-paths into the Readout payload that power its tiles and charts. `lib/tags.ts` is the tag glossary rendered on both dashboards.
