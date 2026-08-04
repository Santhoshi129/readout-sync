import { Kpi, lowSampleCaveat, Section } from "./types";
import { datesOf, deltaOf, GrowthPoint, MemberPoint, seriesOf } from "./history";
import { SEG, Segment, Stage } from "./chart-tokens";
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

// Dev note (not shown as page copy): the threshold good/warn values set on
// each KPI below are working placeholders until Kimberly supplies the agreed
// benchmarks. Update the `threshold` objects here when those targets arrive.

const n = (v: number) => v.toLocaleString();

/* ------------------------------------------------------------------ *
 * Product Usage — from the TWU member-overlap report
 * ------------------------------------------------------------------ */

/** Attaches a real trend to a KPI, or leaves it bare when history is absent. */
function withTrend(kpi: Kpi, values: number[], dates: string[] = [], inverse = false): Kpi {
  if (values.length < 2) return kpi;
  return {
    ...kpi,
    spark: values,
    sparkDates: dates.length === values.length ? dates : undefined,
    delta: deltaOf(values),
    sparkDays: values.length,
    inverse,
  };
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
        adoptionSeries,
        datesOf(history)
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
        seriesOf(history, (p) => p.in_both + p.in_zp_not_app),
        datesOf(history)
      )
    );
  }

  return {
    id: "product-usage",
    title: "Product Usage",
    purpose: "Has the paying member base actually adopted the app?",
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
  const assessed = overlap?.in_both ?? 0;
  const notLinked = overlap?.in_zp_not_app ?? 0;
  const base = assessed + notLinked;
  const counts = normaliseAlertCounts(retention?.alerts_by_type);
  const canRate = retention !== null && assessed > 0;

  /**
   * Is the member base itself growing or shrinking? This is the retention
   * outcome — everything else in this section is a leading indicator of it.
   * Measured across the whole history window, on the full member base, so
   * it is the one figure here that is not limited to app-linked members.
   */
  const baseSeries = seriesOf(history, (p) => p.in_both + p.in_zp_not_app);
  if (baseSeries.length >= 2) {
    const first = baseSeries[0];
    const last = baseSeries[baseSeries.length - 1];
    const changePct = first > 0 ? round1(((last - first) / first) * 100) : 0;
    const days = baseSeries.length;
    kpis.push({
      id: "member-base-change",
      label: `Member Base Change (${days}d)`,
      value: changePct,
      unit: "%",
      threshold: { direction: "higher-is-better", good: 0, warn: -3 },
      detail: `${n(last)} active members now, from ${n(first)} ${days} days ago`,
      spark: baseSeries,
      sparkDates: datesOf(history),
      sparkDays: days,
      delta: null,
    });
  }

  /**
   * The size of the intervention queue. Alert types were verified to be
   * mutually exclusive per member against a live execution (611 alerts,
   * 611 distinct members, no duplicates), so summing the member-level
   * types gives a true headcount rather than a double count.
   */
  const MEMBER_LEVEL = ["at_risk", "needs_attention", "attendance_drop"];
  if (canRate) {
    const flagged = MEMBER_LEVEL.reduce((sum, k) => sum + (counts.get(k) ?? 0), 0);
    if (flagged > 0) {
      const series = seriesOf(history, (p) => {
        const total = MEMBER_LEVEL.reduce((sum, k) => sum + (p.alerts?.[k] ?? 0), 0);
        return p.in_both > 0 ? round1((total / p.in_both) * 100) : null;
      });
      kpis.push(
        withTrend(
          {
            id: "members-needing-action",
            label: "Members Needing Action",
            value: round1((flagged / assessed) * 100),
            unit: "%",
            threshold: { direction: "lower-is-better", good: 20, warn: 35 },
            detail: `${n(flagged)} of ${n(assessed)} assessed members flagged today`,
          },
          series,
          datesOf(history),
          true
        )
      );
    }
  }

  const add = (
    id: string,
    label: string,
    aliases: string[],
    good: number,
    warn: number
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
          value: round1((count / assessed) * 100),
          unit: "%",
          threshold: { direction: "lower-is-better", good, warn },
          detail: `${n(count)} of ${n(assessed)} assessed members`,
          caveat: lowSampleCaveat(assessed),
        },
        series,
        datesOf(history),
        true
      )
    );
  };

  // The severe tier, and the behavioural signal that usually precedes it.
  add("pct-at-risk", "At Risk (severe)", ["at_risk", "atrisk", "risk"], 10, 20);
  add("pct-attendance-drop", "Attendance Drop (7+ days)", ["attendance_drop", "attendance_decline", "no_show"], 10, 20);

  // "Not On App" used to sit here as a health KPI. It is an adoption
  // measure, already carried by App Adoption Rate, and having it in both
  // places put the same fact on the Problem Radar twice. It now appears
  // once, as the caveat below, because that is what it actually is for this
  // section: the limit of what can be assessed at all.
  const coveragePct = base > 0 ? round1((assessed / base) * 100) : 0;
  const caveat =
    base > 0 && notLinked > 0
      ? `Health data covers members linked to the app only (${coveragePct}% of ${n(base)}).`
      : undefined;

  return {
    id: "member-health",
    title: "Member Health",
    purpose: "Are we keeping members, and who needs intervention today?",
    source: "Retention Watch daily run",
    syncedAt: retention?.synced_at ?? retention?.run_completed_at ?? null,
    kpis,
    caveat,
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
          seriesOf(history, (p) => p.interested_rate_pct),
          datesOf(history)
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
          seriesOf(history, (p) => p.hot_lead_share_pct),
          datesOf(history)
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
          seriesOf(history, (p) => p.sequence_complete_rate_pct),
          datesOf(history)
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
          seriesOf(history, (p) => p.total_contacts),
          datesOf(history)
        )
      );
    }
  }

  return {
    id: "pipeline",
    title: "Pipeline",
    purpose: "Is the gym-owner pipeline filling and converting to real interest?",
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
          seriesOf(history, (p) => p.email_reply_rate_pct),
          datesOf(history)
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
          seriesOf(history, (p) => p.ig_reply_rate_pct),
          datesOf(history)
        )
      );
    }
  }

  return {
    id: "outreach",
    title: "Outreach Channels",
    purpose: "Are email and Instagram earning replies at all?",
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
export const NOT_YET_LIVE = [
  {
    label: "Stickiness (DAU/MAU)",
    reason: "awaiting an app-usage endpoint",
    blocker:
      "No endpoint exposes daily or monthly active users. It cannot be derived from Retention Watch, whose payload contains only members that triggered an alert and never the healthy active ones, so any figure built from it would badly undercount.",
    needs: "an app-usage endpoint from Alex",
  },
  {
    label: "Revenue",
    reason: "awaiting Stripe / ZenPlanner billing access",
    blocker:
      "Both halves are in scope and neither has a confirmed source: TWU's own revenue from gyms, and the revenue those gyms bill their own members.",
    needs: "Stripe or GHL invoice access, plus ZenPlanner billing",
  },
];
