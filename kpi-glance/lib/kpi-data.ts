import { Kpi, lowSampleCaveat, Section } from "./types";
import { deltaOf, GrowthPoint, MemberPoint, seriesOf } from "./history";
import { Segment, SEG } from "@/components/CompositionBar";
import { Stage } from "@/components/FunnelBar";
import {
  GrowthOutreachPayload,
  OverlapSnapshot,
  RetentionSnapshot,
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

/** Attaches a real trend to a KPI, or leaves it bare when history is absent. */
function withTrend(kpi: Kpi, values: number[], inverse = false): Kpi {
  if (values.length < 2) return kpi;
  return { ...kpi, spark: values, delta: deltaOf(values), sparkDays: values.length, inverse };
}

export function buildProductUsage(
  overlap: OverlapSnapshot | null,
  history: MemberPoint[] = []
): Section {
  const kpis: Kpi[] = [];
  const linked = overlap?.in_both ?? 0;
  const notLinked = overlap?.in_zp_not_app ?? 0;
  const total = linked + notLinked;

  if (overlap && total > 0) {
    const adoptionSeries = seriesOf(history, (p) =>
      p.in_both + p.in_zp_not_app > 0 ? round1((p.in_both / (p.in_both + p.in_zp_not_app)) * 100) : null
    );
    kpis.push(
      withTrend(
        {
          id: "app-adoption-rate",
          label: "App Adoption Rate",
          value: round1((linked / total) * 100),
          unit: "%",
          threshold: { direction: "higher-is-better", good: 70, warn: 50 },
          detail: `${n(linked)} of ${n(total)} active members on the app`,
        },
        adoptionSeries
      )
    );
    kpis.push(
      withTrend(
        {
          id: "members-covered",
          label: "Members Covered",
          value: total,
          unit: "count",
          threshold: null,
          detail: "active ZenPlanner members across all gyms",
        },
        seriesOf(history, (p) => p.in_both + p.in_zp_not_app)
      )
    );
  }

  return {
    id: "product-usage",
    title: "Product Usage",
    source:
      overlap?.origin === "n8n" ? "member-overlap via Retention Watch" : "TWU member-overlap API",
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
  overlap: OverlapSnapshot | null,
  retention: RetentionSnapshot | null,
  history: MemberPoint[] = []
): Section {
  const kpis: Kpi[] = [];
  const linked = overlap?.in_both ?? 0;
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
    const series = seriesOf(history, (p) => {
      const k = aliases.find((a) => a in (p.alerts ?? {}));
      if (k === undefined || p.in_both <= 0) return null;
      return round1((p.alerts[k] / p.in_both) * 100);
    });
    kpis.push(
      withTrend(
        {
          id,
          label,
          value: round1((count / linked) * 100),
          unit: "%",
          threshold: { direction: "lower-is-better", good, warn },
          detail: note ?? `${n(count)} of ${n(linked)} linked members`,
          caveat: lowSampleCaveat(linked),
        },
        series,
        true
      )
    );
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
  // "Data Coverage Gap" was defined against a snapshot_pending alert type
  // the live workflow does not emit. Its real alert types are not_on_app /
  // needs_attention / at_risk / attendance_drop, so the gap is expressed
  // against the one that exists: members never linked to the app, measured
  // over the whole member base rather than over linked members.
  if (retention !== null && overlap && overlap.in_both + overlap.in_zp_not_app > 0) {
    const key = ["not_on_app", "never_linked"].find((a) => counts.has(a));
    if (key !== undefined) {
      const base = overlap.in_both + overlap.in_zp_not_app;
      const series = seriesOf(history, (p) => {
        const total = p.in_both + p.in_zp_not_app;
        const k = ["not_on_app", "never_linked"].find((a) => a in (p.alerts ?? {}));
        if (k === undefined || total <= 0) return null;
        return round1((p.alerts[k] / total) * 100);
      });
      kpis.push(
        withTrend(
          {
            id: "not-on-app",
            label: "Not On App",
            value: round1((counts.get(key)! / base) * 100),
            unit: "%",
            threshold: { direction: "lower-is-better", good: 30, warn: 50 },
            detail: `${n(counts.get(key)!)} of ${n(base)} members never linked the app`,
            caveat: lowSampleCaveat(base),
          },
          series,
          true
        )
      );
    }
  }

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

export function buildPipeline(
  go: GrowthOutreachPayload | null,
  history: GrowthPoint[] = []
): Section {
  const kpis: Kpi[] = [];

  if (go) {
    if (go.email_replied > 0) {
      kpis.push(
        withTrend(
          {
            id: "interested-rate",
            label: "Interested Rate",
            value: go.interested_rate_pct,
            unit: "%",
            threshold: { direction: "higher-is-better", good: 25, warn: 12 },
            detail: `${n(go.interested)} of ${n(go.email_replied)} replies marked interested`,
            caveat: lowSampleCaveat(go.email_replied),
          },
          seriesOf(history, (p) => p.interested_rate_pct)
        )
      );
    }
    if (go.hot_leads + go.warm_leads > 0) {
      kpis.push(
        withTrend(
          {
            id: "hot-lead-share",
            label: "Hot Lead Share",
            value: go.hot_lead_share_pct,
            unit: "%",
            threshold: { direction: "higher-is-better", good: 40, warn: 20 },
            detail: `${n(go.hot_leads)} hot of ${n(go.hot_leads + go.warm_leads)} qualified leads`,
            caveat: lowSampleCaveat(go.hot_leads + go.warm_leads),
          },
          seriesOf(history, (p) => p.hot_lead_share_pct)
        )
      );
    }
    if (go.sequence_complete + go.sequence_stopped > 0) {
      kpis.push(
        withTrend(
          {
            id: "sequence-complete-rate",
            label: "Sequence Complete Rate",
            value: go.sequence_complete_rate_pct,
            unit: "%",
            threshold: { direction: "higher-is-better", good: 70, warn: 50 },
            detail: `${n(go.sequence_complete)} completed vs ${n(go.sequence_stopped)} stopped early`,
            caveat: lowSampleCaveat(go.sequence_complete + go.sequence_stopped),
          },
          seriesOf(history, (p) => p.sequence_complete_rate_pct)
        )
      );
    }
    if (go.total_contacts > 0) {
      kpis.push(
        withTrend(
          {
            id: "total-pipeline-contacts",
            label: "Total Pipeline Contacts",
            value: go.total_contacts,
            unit: "count",
            threshold: null,
            detail: "gym-owner contacts in the GHL pipeline",
          },
          seriesOf(history, (p) => p.total_contacts)
        )
      );
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

export function buildOutreach(
  go: GrowthOutreachPayload | null,
  history: GrowthPoint[] = []
): Section {
  const kpis: Kpi[] = [];

  if (go) {
    if (go.email_sent > 0) {
      kpis.push(
        withTrend(
          {
            id: "email-reply-rate",
            label: "Email Reply Rate",
            value: go.email_reply_rate_pct,
            unit: "%",
            threshold: { direction: "higher-is-better", good: 8, warn: 4 },
            detail: `${n(go.email_replied)} replies of ${n(go.email_sent)} sent`,
            caveat: lowSampleCaveat(go.email_sent),
          },
          seriesOf(history, (p) => p.email_reply_rate_pct)
        )
      );
    }
    if (go.ig_sent_total > 0) {
      kpis.push(
        withTrend(
          {
            id: "ig-reply-rate",
            label: "IG Reply Rate",
            value: go.ig_reply_rate_pct,
            unit: "%",
            threshold: { direction: "higher-is-better", good: 12, warn: 6 },
            detail: `${n(go.ig_replies)} replies of ${n(go.ig_sent_total)} DMs sent`,
            caveat: lowSampleCaveat(go.ig_sent_total),
          },
          seriesOf(history, (p) => p.ig_reply_rate_pct)
        )
      );
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
 * The volume story behind the Pipeline rates: how many gym-owner contacts
 * make it from the list to an actual expression of interest. A rate like
 * "Interested Rate 7.4%" is unreadable without these counts beside it.
 */
export function buildPipelineFunnel(go: GrowthOutreachPayload | null): Stage[] {
  if (!go) return [];
  return [
    { label: "Contacts in pipeline", value: go.total_contacts },
    { label: "Outreach sent", value: go.email_sent },
    { label: "Replied", value: go.email_replied },
    { label: "Marked interested", value: go.interested },
  ];
}

/** Instagram runs as its own shorter funnel. */
export function buildInstagramFunnel(go: GrowthOutreachPayload | null): Stage[] {
  if (!go || go.ig_sent_total <= 0) return [];
  return [
    { label: "DMs sent", value: go.ig_sent_total },
    { label: "Replied", value: go.ig_replies },
  ];
}

/** Where the member base sits: on the app versus never linked. */
export function buildMemberSplit(overlap: OverlapSnapshot | null): Segment[] {
  if (!overlap) return [];
  return [
    { label: "On the app", value: overlap.in_both, color: SEG.good },
    { label: "Never linked", value: overlap.in_zp_not_app, color: SEG.neutral },
  ];
}

/**
 * What the day's alerts actually consist of. These counts sum exactly to
 * alert_count, so the split is exhaustive rather than indicative.
 */
export function buildAlertMix(retention: RetentionSnapshot | null): Segment[] {
  const by = retention?.alerts_by_type ?? {};
  const pick = (key: string, label: string, color: string): Segment | null =>
    typeof by[key] === "number" && by[key] > 0 ? { label, value: by[key], color } : null;

  // Ordered most severe first, matching the ordinal ramp.
  return [
    pick("at_risk", "At risk", SEG.sev1),
    pick("attendance_drop", "Attendance drop", SEG.sev2),
    pick("needs_attention", "Needs attention", SEG.sev3),
    pick("not_on_app", "Not on app", SEG.sev4),
  ].filter((x): x is Segment => x !== null);
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
