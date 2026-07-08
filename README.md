# TWU · The Readout — Systems Dashboard

Internal operations dashboard for the Train With Us / Blended Athletics automation
stack. Every metric is fetched **live** from The Readout (`/twu-readout-data`, v9.0).
Nothing is hardcoded — where a number isn't instrumented yet, the UI says so rather
than faking it.

## What's inside

- **Overview** (`/`) — hero, headline stats, the cold→community funnel, seven
  system-health canaries, and a clickable grid of all 15 flows.
- **Flow drilldown** (`/flows/[slug]`) — per flow, in order: two-lens analysis
  (Business / Technical toggle) → live-since date → live report + charts → health
  checks → System Updates changelog → tag notes (only where useful).
- **Password gate** — single shared password, signed session cookie, enforced in
  `middleware.ts` at the edge before any page renders.

## Design

Matches the TWU app: pure black `#000`, amber `#C9A84C`, `#141414`/`#1a1a1a`
cards, SF Pro system type, circular progress rings, gradient funnel bars. Desktop
layout.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev
```

`.env.local`:

| var | what it is |
|---|---|
| `DASHBOARD_PASSWORD` | the shared password everyone types to get in |
| `SESSION_SECRET` | any long random string — signs the session cookie |
| `READOUT_BASE_URL` | base URL of the n8n instance (default already points at the live one) |

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (framework auto-detected as Next.js).
2. Add the three env vars above in **Project → Settings → Environment Variables**.
3. Deploy. The app fetches The Readout server-side on every request (`no-store`), so
   numbers are always current.

## Data contract

`lib/readout.ts` types the entire v9.0 payload. `lib/flows.ts` is the registry:
each flow declares its analysis, go-live date, changelog, health canaries, tag notes,
and — critically — the **dot-paths** into the Readout payload that power its tiles and
charts. To add or rebind a metric, edit the path there; no other change needed.

## Honesty flags (by design)

- **cached** — `lead_sources_enriched` (hot/warm/avg-score/email split) refreshes only
  when enrichment runs, not per read.
- **not instrumented** — `reply_breakdown.auto_ack` reads 0 until the `auto-ack-detected`
  tag write is deployed in the Reply Detector.
- **canary** — `ig_bridge_stuck_pending` (IG Bridge Pipeline A label collision),
  `resume_sequence_exhausted` (new in v9.0), and the integrity checks.
- **Retention Watch** has no live tiles: it computes real alerts but delivery currently
  terminates at the Test Receiver, so it's flagged, not faked.

## ROI

Intentionally omitted for v1 (internal ops). The registry and Readout already carry the
volume a value section would need (joined, drafts, sends, replies), so adding it later is
one input (monthly running cost) plus a front-end block — no backend change.
