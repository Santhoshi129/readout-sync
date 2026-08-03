import { Kpi } from "./types";
import { GrowthOutreachPayload, OverlapData, RetentionAlertsPayload, round1 } from "./live-data";

/**
 * `status` on each KPI controls what the UI shows:
 *   "sample"  -> real formula, placeholder number, shown with a SAMPLE tag
 *   "live"    -> real formula, real number
 *   "blocked" -> no data source yet, shown greyed out with the blocker noted
 *
 * Growth/Outreach originally targeted trial-conversion/win-rate style
 * metrics, but TWU's gym-owners GHL pipeline is an outreach-sequence
 * tracker, not a sales-stage CRM — there's no won/lost or trial data to
 * pull. Swapped for what the tags actually support: reply rates, lead
 * quality mix, and sequence completion. See app/api/cron/sync-growth-outreach.
 */

export function buildGrowthKpis(go: GrowthOutreachPayload | null): Kpi[] {
  const live = go !== null;
  return [
    {
      id: "interested-rate",
      question: "growth",
      label: "Interested Rate",
      value: live ? go!.interested_rate_pct : 22,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 25, warn: 12 },
      trendDeltaPct: null,
      source: "GHL gym-owners (interested / replied)",
      status: live ? "live" : "sample",
      note: live ? `${go!.interested} of ${go!.email_replied} replies marked interested` : undefined,
    },
    {
      id: "hot-lead-share",
      question: "growth",
      label: "Hot Lead Share",
      value: live ? go!.hot_lead_share_pct : 38,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 40, warn: 20 },
      trendDeltaPct: null,
      source: "GHL gym-owners tag mix",
      status: live ? "live" : "sample",
      note: live ? `${go!.hot_leads} hot / ${go!.hot_leads + go!.warm_leads} hot+warm` : undefined,
    },
    {
      id: "sequence-complete-rate",
      question: "growth",
      label: "Sequence Complete Rate",
      value: live ? go!.sequence_complete_rate_pct : 64,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 70, warn: 50 },
      trendDeltaPct: null,
      source: "GHL gym-owners",
      status: live ? "live" : "sample",
      note: live ? `${go!.sequence_complete} completed vs ${go!.sequence_stopped} stopped early` : undefined,
    },
    {
      id: "total-pipeline-contacts",
      question: "growth",
      label: "Total Pipeline Contacts",
      value: live ? go!.total_contacts : 850,
      unit: "count",
      threshold: null,
      trendDeltaPct: null,
      source: "GHL gym-owners",
      status: live ? "live" : "sample",
      note: "Scale indicator, not a rate — no fixed target",
    },
  ];
}

export function buildOutreachKpis(go: GrowthOutreachPayload | null): Kpi[] {
  const live = go !== null;
  return [
    {
      id: "email-reply-rate",
      question: "outreach",
      label: "Email Reply Rate",
      value: live ? go!.email_reply_rate_pct : 6.4,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 8, warn: 4 },
      trendDeltaPct: null,
      source: "GHL gym-owners",
      status: live ? "live" : "sample",
      note: live ? `${go!.email_replied} of ${go!.email_sent} sent` : undefined,
    },
    {
      id: "ig-reply-rate",
      question: "outreach",
      label: "IG Reply Rate",
      value: live ? go!.ig_reply_rate_pct : 9.8,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 12, warn: 6 },
      trendDeltaPct: null,
      source: "GHL gym-owners",
      status: live ? "live" : "sample",
      note: live ? `${go!.ig_replies} of ${go!.ig_sent_total} sent` : undefined,
    },
  ];
}

export function buildAdoptionKpis(overlap: OverlapData | null): Kpi[] {
  const live = overlap !== null;
  const inBoth = overlap?.in_both?.length ?? 0;
  const inZpNotApp = overlap?.in_zp_not_app?.length ?? 0;
  const total = inBoth + inZpNotApp;
  const rate = live && total > 0 ? round1((inBoth / total) * 100) : 64;

  return [
    {
      id: "app-adoption-rate",
      question: "adoption",
      label: "App Adoption Rate",
      value: rate,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 70, warn: 50 },
      trendDeltaPct: live ? null : 3.4,
      source: "Retention Watch overlap report",
      status: live ? "live" : "sample",
      note: live
        ? `${inBoth} linked / ${total} total active ZenPlanner members`
        : "TWU_API_TOKEN not set in Vercel — showing sample data",
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
      note: "Needs a per-member engagement call — too slow to run live on every page load, needs the daily snapshot persisted somewhere first",
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
}

export function buildRetentionKpis(overlap: OverlapData | null, retention: RetentionAlertsPayload | null): Kpi[] {
  const inBoth = overlap?.in_both?.length ?? 0;
  const inZpNotApp = overlap?.in_zp_not_app?.length ?? 0;
  const total = inBoth + inZpNotApp;
  const hasOverlap = overlap !== null && total > 0;
  const hasRetention = retention !== null;
  const byType = retention?.alerts_by_type ?? {};

  // A KPI needs BOTH pieces to be real: the alert count (numerator, from
  // the webhook payload) and total in_both members (denominator, from the
  // overlap report) — having only one still leaves a sample number.
  const pctOf = (alertType: string, fallback: number): { value: number; live: boolean; note?: string } => {
    if (hasOverlap && hasRetention && inBoth > 0) {
      const count = byType[alertType] ?? 0;
      return {
        value: round1((count / inBoth) * 100),
        live: true,
        note: `${count} of ${inBoth} linked members`,
      };
    }
    return { value: fallback, live: false };
  };

  const atRisk = pctOf("at_risk", 12.5);
  const needsAttention = pctOf("needs_attention", 18.9);
  const attendanceDrop = pctOf("attendance_drop", 14.1);
  const snapshotPending = pctOf("snapshot_pending", 4.2);
  const adoptionGapValue = hasOverlap ? round1((inZpNotApp / total) * 100) : 36;

  const blockerNote = !hasRetention
    ? "Retention Watch still needs to be repointed at /api/retention-webhook — see instructions"
    : !hasOverlap
    ? "TWU_API_TOKEN not set — have the alert counts but not the total member count to turn them into a %"
    : undefined;

  return [
    {
      id: "pct-at-risk",
      question: "retention",
      label: "Members At-Risk",
      value: atRisk.value,
      unit: "%",
      threshold: { direction: "lower-is-better", good: 10, warn: 20 },
      trendDeltaPct: null,
      source: "Retention Watch daily payload",
      status: atRisk.live ? "live" : "sample",
      note: atRisk.note ?? blockerNote,
    },
    {
      id: "pct-needs-attention",
      question: "retention",
      label: "Needs Attention",
      value: needsAttention.value,
      unit: "%",
      threshold: { direction: "lower-is-better", good: 15, warn: 25 },
      trendDeltaPct: null,
      source: "Retention Watch daily payload",
      status: needsAttention.live ? "live" : "sample",
      note: needsAttention.note,
    },
    {
      id: "pct-attendance-drop",
      question: "retention",
      label: "Attendance Drop (7+ days)",
      value: attendanceDrop.value,
      unit: "%",
      threshold: { direction: "lower-is-better", good: 10, warn: 20 },
      trendDeltaPct: null,
      source: "Retention Watch daily payload",
      status: attendanceDrop.live ? "live" : "sample",
      note: attendanceDrop.note,
    },
    {
      id: "adoption-gap",
      question: "retention",
      label: "Adoption Gap (not on app)",
      value: adoptionGapValue,
      unit: "%",
      threshold: { direction: "lower-is-better", good: 30, warn: 50 },
      trendDeltaPct: null,
      source: "Retention Watch overlap report",
      status: hasOverlap ? "live" : "sample",
      note: hasOverlap ? `${inZpNotApp} of ${total} active ZenPlanner members never linked the app` : undefined,
    },
    {
      id: "data-coverage-gap",
      question: "retention",
      label: "Data Coverage Gap",
      value: snapshotPending.value,
      unit: "%",
      threshold: { direction: "lower-is-better", good: 5, warn: 15 },
      trendDeltaPct: null,
      source: "Retention Watch daily payload",
      status: snapshotPending.live ? "live" : "sample",
      note:
        snapshotPending.note ??
        "Operational health, not member health — high value means engagement snapshots aren't generating for some members",
    },
  ];
}

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
