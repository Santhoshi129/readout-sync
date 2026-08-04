import { Kpi, Section } from "./types";
import {
  GrowthOutreachPayload,
  OverlapData,
  RetentionAlertsPayload,
  round1,
} from "./live-data";

/**
 * Every builder below returns real numbers or nothing at all.
 *
 * There are deliberately no sample values and no placeholder cards: if a
 * daily snapshot is missing, or a payload doesn't contain the field a KPI
 * needs, that KPI is omitted, and a section with no KPIs left is not
 * rendered. A number on this page is always a real number.
 */

const n = (v: number) => v.toLocaleString();

/* ------------------------------------------------------------------ *
 * Product Usage — from the TWU member-overlap report
 * ------------------------------------------------------------------ */

export function buildProductUsage(overlap: OverlapData | null): Section {
  const kpis: Kpi[] = [];
  const linked = overlap?.in_both?.length ?? 0;
  const notLinked = overlap?.in_zp_not_app?.length ?? 0;
  const total = linked + notLinked;

  if (overlap && total > 0) {
    kpis.push({
      id: "app-adoption-rate",
      label: "App Adoption Rate",
      value: round1((linked / total) * 100),
      unit: "%",
      threshold: { direction: "higher-is-better", good: 70, warn: 50 },
      detail: `${n(linked)} of ${n(total)} active members on the app`,
    });
    kpis.push({
      id: "members-covered",
      label: "Members Covered",
      value: total,
      unit: "count",
      threshold: null,
      detail: "active ZenPlanner members across all gyms",
    });
  }

  return {
    id: "product-usage",
    title: "Product Usage",
    source: "TWU member-overlap API",
    syncedAt: overlap?.synced_at ?? null,
    kpis,
  };
}

/* ------------------------------------------------------------------ *
 * Member Health — from the Retention Watch daily payload
 * ------------------------------------------------------------------ */

/** Alert-type keys vary in casing/spacing across payload versions. */
function normaliseAlertCounts(raw: Record<string, unknown> | undefined) {
  const out = new Map<string, number>();
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    const num = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(num)) continue;
    out.set(String(k).toLowerCase().replace(/[^a-z0-9]+/g, "_"), num);
  }
  return out;
}

export function buildMemberHealth(
  overlap: OverlapData | null,
  retention: RetentionAlertsPayload | null
): Section {
  const kpis: Kpi[] = [];
  const linked = overlap?.in_both?.length ?? 0;
  const counts = normaliseAlertCounts(retention?.alerts_by_type);

  // A rate needs both halves to be real: the alert count from Retention
  // Watch, and the linked-member denominator from the overlap report.
  const canRate = retention !== null && linked > 0;

  const add = (
    id: string,
    label: string,
    aliases: string[],
    good: number,
    warn: number,
    note?: string
  ) => {
    if (!canRate) return;
    const key = aliases.find((a) => counts.has(a));
    if (key === undefined) return; // field absent from payload — omit rather than show 0%
    const count = counts.get(key)!;
    kpis.push({
      id,
      label,
      value: round1((count / linked) * 100),
      unit: "%",
      threshold: { direction: "lower-is-better", good, warn },
      detail: note ?? `${n(count)} of ${n(linked)} linked members`,
    });
  };

  add("pct-at-risk", "Members At-Risk", ["at_risk", "atrisk", "risk"], 10, 20);
  add("pct-needs-attention", "Needs Attention", ["needs_attention", "attention"], 15, 25);
  add(
    "pct-attendance-drop",
    "Attendance Drop (7+ days)",
    ["attendance_drop", "attendance_decline", "no_show"],
    10,
    20
  );
  add(
    "data-coverage-gap",
    "Data Coverage Gap",
    ["snapshot_pending", "no_snapshot", "missing_snapshot"],
    5,
    15,
    undefined
  );

  return {
    id: "member-health",
    title: "Member Health",
    source: "Retention Watch daily run",
    syncedAt: retention?.synced_at ?? retention?.run_completed_at ?? null,
    kpis,
  };
}

/* ------------------------------------------------------------------ *
 * Pipeline + Outreach — from the GHL gym-owners contact tags
 * ------------------------------------------------------------------ */

export function buildPipeline(go: GrowthOutreachPayload | null): Section {
  const kpis: Kpi[] = [];

  if (go) {
    if (go.email_replied > 0) {
      kpis.push({
        id: "interested-rate",
        label: "Interested Rate",
        value: go.interested_rate_pct,
        unit: "%",
        threshold: { direction: "higher-is-better", good: 25, warn: 12 },
        detail: `${n(go.interested)} of ${n(go.email_replied)} replies marked interested`,
      });
    }
    if (go.hot_leads + go.warm_leads > 0) {
      kpis.push({
        id: "hot-lead-share",
        label: "Hot Lead Share",
        value: go.hot_lead_share_pct,
        unit: "%",
        threshold: { direction: "higher-is-better", good: 40, warn: 20 },
        detail: `${n(go.hot_leads)} hot of ${n(go.hot_leads + go.warm_leads)} qualified leads`,
      });
    }
    if (go.sequence_complete + go.sequence_stopped > 0) {
      kpis.push({
        id: "sequence-complete-rate",
        label: "Sequence Complete Rate",
        value: go.sequence_complete_rate_pct,
        unit: "%",
        threshold: { direction: "higher-is-better", good: 70, warn: 50 },
        detail: `${n(go.sequence_complete)} completed vs ${n(go.sequence_stopped)} stopped early`,
      });
    }
    if (go.total_contacts > 0) {
      kpis.push({
        id: "total-pipeline-contacts",
        label: "Total Pipeline Contacts",
        value: go.total_contacts,
        unit: "count",
        threshold: null,
        detail: "gym-owner contacts in the GHL pipeline",
      });
    }
  }

  return {
    id: "pipeline",
    title: "Pipeline",
    source: "GHL gym-owners",
    syncedAt: go?.synced_at ?? null,
    kpis,
  };
}

export function buildOutreach(go: GrowthOutreachPayload | null): Section {
  const kpis: Kpi[] = [];

  if (go) {
    if (go.email_sent > 0) {
      kpis.push({
        id: "email-reply-rate",
        label: "Email Reply Rate",
        value: go.email_reply_rate_pct,
        unit: "%",
        threshold: { direction: "higher-is-better", good: 8, warn: 4 },
        detail: `${n(go.email_replied)} replies of ${n(go.email_sent)} sent`,
      });
    }
    if (go.ig_sent_total > 0) {
      kpis.push({
        id: "ig-reply-rate",
        label: "IG Reply Rate",
        value: go.ig_reply_rate_pct,
        unit: "%",
        threshold: { direction: "higher-is-better", good: 12, warn: 6 },
        detail: `${n(go.ig_replies)} replies of ${n(go.ig_sent_total)} DMs sent`,
      });
    }
  }

  return {
    id: "outreach",
    title: "Outreach Channels",
    source: "GHL gym-owners",
    syncedAt: go?.synced_at ?? null,
    kpis,
  };
}

/**
 * Two KPI groups are confirmed in scope but have no data source yet, so
 * they are not rendered as cards at all — only named in the page footer:
 *
 *  - Stickiness (DAU/MAU): needs an app-usage endpoint from Alex. It cannot
 *    be derived from Retention Watch, whose payload only contains members
 *    that triggered an alert, never the healthy active ones.
 *  - Revenue: TWU's own revenue needs Stripe or GHL invoice access; gym-client
 *    revenue needs ZenPlanner billing access. Neither is confirmed.
 */
export const NOT_YET_LIVE: { label: string; reason: string }[] = [
  { label: "Stickiness (DAU/MAU)", reason: "awaiting an app-usage endpoint" },
  { label: "Revenue", reason: "awaiting Stripe / ZenPlanner billing access" },
];
