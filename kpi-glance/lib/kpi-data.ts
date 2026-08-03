import { Kpi } from "./types";

/**
 * SAMPLE DATA — v1 scaffold.
 *
 * Every KPI here is wired for the real formula/source described in
 * twu-kpi-dashboard-spec.md. To go live, replace the literal values below
 * with real fetches:
 *   - GHL gym-owners + GHL members: reuse the auth pattern from readout-sync
 *   - Retention Watch: read the daily payload the n8n workflow POSTs
 *     (currently only in n8n's own execution log — see note on retentionKpis)
 *   - Revenue: blocked until data source is confirmed (see revenueKpis)
 *
 * `status` on each KPI controls what the UI shows:
 *   "sample"  -> real formula, placeholder number, shown with a SAMPLE tag
 *   "live"    -> real formula, real number
 *   "blocked" -> no data source yet, shown greyed out with the blocker noted
 */

export const growthKpis: Kpi[] = [
  {
    id: "lead-to-trial",
    question: "growth",
    label: "Lead → Trial Conversion",
    value: 13.2,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 15, warn: 8 },
    trendDeltaPct: 2.1,
    source: "GHL gym-owners",
    status: "sample",
  },
  {
    id: "trial-to-active",
    question: "growth",
    label: "Trial → Active Conversion",
    value: 51,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 60, warn: 40 },
    trendDeltaPct: -4.5,
    source: "GHL gym-owners",
    status: "sample",
  },
  {
    id: "win-rate",
    question: "growth",
    label: "Win Rate",
    value: 21,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 25, warn: 15 },
    trendDeltaPct: 0.8,
    source: "GHL gym-owners",
    status: "sample",
  },
  {
    id: "sales-cycle",
    question: "growth",
    label: "Sales Cycle Length",
    value: 18,
    unit: "days",
    threshold: null,
    trendDeltaPct: 11.0,
    source: "GHL gym-owners",
    status: "sample",
    note: "Trending longer vs prior period — watch, no fixed target",
  },
];

export const outreachKpis: Kpi[] = [
  {
    id: "email-reply-rate",
    question: "outreach",
    label: "Email Reply Rate",
    value: 6.4,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 8, warn: 4 },
    trendDeltaPct: 1.2,
    source: "Readout sync / GHL",
    status: "sample",
  },
  {
    id: "ig-reply-rate",
    question: "outreach",
    label: "IG Reply Rate",
    value: 9.8,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 12, warn: 6 },
    trendDeltaPct: -1.0,
    source: "Readout sync / GHL",
    status: "sample",
  },
  {
    id: "outreach-to-call",
    question: "outreach",
    label: "Outreach → Call Booked",
    value: 1.9,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 3, warn: 1.5 },
    trendDeltaPct: 0.3,
    source: "GHL",
    status: "sample",
  },
];

export const adoptionKpis: Kpi[] = [
  {
    id: "app-adoption-rate",
    question: "adoption",
    label: "App Adoption Rate",
    value: 64,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 70, warn: 50 },
    trendDeltaPct: 3.4,
    source: "Retention Watch overlap report",
    status: "sample",
    note: "in_both / (in_both + in_zp_not_app) — this one is ready to go live today, no new endpoint needed",
  },
  {
    id: "new-app-signups",
    question: "adoption",
    label: "New App Signups (30d)",
    value: 34,
    unit: "count",
    threshold: null,
    trendDeltaPct: 9.0,
    source: "Retention Watch engagement data",
    status: "sample",
  },
  {
    id: "dau-mau",
    question: "adoption",
    label: "DAU / MAU (Stickiness)",
    value: null,
    unit: "%",
    threshold: { direction: "higher-is-better", good: 20, warn: 10 },
    trendDeltaPct: null,
    source: "App usage endpoint (Alex)",
    status: "blocked",
    note: "Blocked — waiting on the app-usage endpoint Dave mentioned Alex would provide",
  },
];

export const retentionKpis: Kpi[] = [
  {
    id: "pct-at-risk",
    question: "retention",
    label: "Members At-Risk",
    value: 12.5,
    unit: "%",
    threshold: { direction: "lower-is-better", good: 10, warn: 20 },
    trendDeltaPct: null,
    source: "Retention Watch daily payload",
    status: "sample",
    note: "No trend arrow yet — daily runs aren't persisted anywhere queryable, only in n8n's own execution log",
  },
  {
    id: "pct-needs-attention",
    question: "retention",
    label: "Needs Attention",
    value: 18.9,
    unit: "%",
    threshold: { direction: "lower-is-better", good: 15, warn: 25 },
    trendDeltaPct: null,
    source: "Retention Watch daily payload",
    status: "sample",
  },
  {
    id: "pct-attendance-drop",
    question: "retention",
    label: "Attendance Drop (7+ days)",
    value: 14.1,
    unit: "%",
    threshold: { direction: "lower-is-better", good: 10, warn: 20 },
    trendDeltaPct: null,
    source: "Retention Watch daily payload",
    status: "sample",
  },
  {
    id: "adoption-gap",
    question: "retention",
    label: "Adoption Gap (not on app)",
    value: 36,
    unit: "%",
    threshold: { direction: "lower-is-better", good: 30, warn: 50 },
    trendDeltaPct: null,
    source: "Retention Watch daily payload",
    status: "sample",
  },
  {
    id: "data-coverage-gap",
    question: "retention",
    label: "Data Coverage Gap",
    value: 4.2,
    unit: "%",
    threshold: { direction: "lower-is-better", good: 5, warn: 15 },
    trendDeltaPct: null,
    source: "Retention Watch daily payload",
    status: "sample",
    note: "Operational health, not member health — high value means engagement snapshots aren't generating for some members",
  },
];

/**
 * Revenue is confirmed in scope (both TWU's own revenue and gym-client
 * revenue) but the data source for each hasn't been confirmed yet:
 *   - TWU's own revenue: Stripe? GHL invoices? — TBD
 *   - Gym client revenue: likely ZenPlanner billing, same system Retention
 *     Watch already reads from — needs API access confirmed
 * Left out of the KPI arrays above entirely rather than shipped as fake
 * numbers. Add a `revenueKpis` array here once a source is confirmed.
 */
export const revenueBlocked = true;

export const allSections = [
  { id: "growth", title: "Growth", question: "Is it growing?", kpis: growthKpis },
  { id: "outreach", title: "Outreach Effectiveness", question: "Is it working?", kpis: outreachKpis },
  { id: "adoption", title: "App Adoption", question: "Is it working? Is it growing?", kpis: adoptionKpis },
  { id: "retention", title: "Retention Health", question: "Where are the problems?", kpis: retentionKpis },
] as const;
