// lib/readout.ts
// Live data contract for TWU · The Readout (v9.0).
// Every dashboard metric traces to a field defined here. Nothing is hardcoded.
// Shapes mirror the "Live Parallel Fetch & Build JSON" node exactly.

export type Freshness = Record<string, string>;

export interface Readout {
  meta: {
    dashboard: string;
    generated_at: string;
    version: string;
    data_freshness: Freshness;
  };
  lead_gen: {
    total_contacts_in_ghl: number;
    crossfit_contacts_in_ghl: number;
    hyrox_contacts_in_ghl: number;
    hot_leads: number;
    warm_leads: number;
    email_outreach_sent: number;
    email_replied: number;
    sequence_complete: number;
    touch_sequence: {
      in_sequence: number;
      step_1: number; step_2: number; step_3: number; step_4: number; step_5: number;
    };
    ig_outreach_ready: number;
    ig_outreach_sent: number;
    ig_replied_positive: number;
    ig_replied_negative: number;
    replied_contacts: { name: string; time: string; channel: string }[];
    phone_followup_due: number;
    phone_still_due: number;
    phone_positive: number;
    phone_negative: number;
    phone_called_only: number;
    phone_resolved: number;
    stage_new_lead: number;
    stage_responded: number;
    stage_dead: number;
    stage_no_response: number;
    stage_ig_outreach: number;
    total_in_pipeline: number;
    email_reply_rate_pct: number;
  };
  lead_sources_raw: {
    cf_scraped: number; cf_processed: number; cf_pending: number;
    hy_scraped: number; hy_processed: number; hy_pending: number;
    combined_scraped: number; combined_processed: number; combined_pending: number;
  };
  lead_sources_failed: {
    cf_failed: number; hy_failed: number; total_failed: number;
    cf_no_email: number; hy_no_email: number; total_no_email: number;
    cf_duplicates_skipped: number; hy_duplicates_skipped: number; total_duplicates_skipped: number;
  };
  lead_sources_drafts: {
    cf_drafts_created: number; hy_drafts_created: number; total_drafts_created: number;
  };
  lead_sources_enriched: Record<string, number>;
  app_adoption: {
    total_identified: number;
    email_draft_in_gmail: number;
    followup_draft_in_gmail: number;
    email_outreach_confirmed: number;
    followup_confirmed: number;
    adopted: number;
    already_on_app: number;
    total_joined: number;
    opted_out: number;
    no_response: number;
    needs_dave_review: number;
    adoption_rate_pct: number;
    no_email_mongo_count: number;
    duplicate_mongo_count: number;
    no_email_sheet_count: number;
    duplicate_sheet_count: number;
    not_joining_confirmed: number;
    stage_drafted: number; stage_sent: number; stage_followup: number;
    stage_no_response: number; stage_adopted: number; stage_not_joining: number;
    stage_opted_out: number; stage_replied: number;
  };
  geo_distribution: { label: string; count: number }[];
  data_integrity: {
    stuck_draft_tags: number;
    step_tag_mismatch: number;
    ig_unmatched_duplicates: number;
    ig_bridge_stuck_pending: number;
    stuck_past_resume_date: number;
    missing_resume_date: number;
    legacy_ig_bridge_stuck_tag: number;
    [k: string]: unknown;
  };
  reply_breakdown: {
    interested: number; not_interested: number; auto_responder: number;
    auto_ack: number; other: number; total_classified: number;
  };
  alt_email_outreach: {
    auto_responders_detected: number;
    alt_outreach_started: number;
    alt_outreach_coverage_pct: number;
    in_alt_outreaching_stage: number;
    awaiting_reply: number;
    replied: number;
    interested: number;
    not_interested: number;
  };
  ig_bridge_outreach: {
    touch1_sent: number; sequence_complete: number;
    replied_interested: number; replied_not_interested: number;
    auto_ack: number; needs_review: number;
    temp_paused: number; temp_paused_legacy_tag: number; reply_rate_pct: number;
  };
  temp_away_pause_resume: {
    total_paused: number;
    paused_by_source: Record<string, number>;
    total_resumed: number;
    resumed_by_source: Record<string, number>;
    resume_sequence_exhausted?: number;
    resume_exhausted_by_source?: Record<string, number>;
    stuck_past_resume_date: number;
    missing_resume_date: number;
    legacy_ig_bridge_stuck_tag: number;
  };
  summary: Record<string, number>;
}

const BASE = process.env.READOUT_BASE_URL || "https://trainwithus.app.n8n.cloud/webhook";

// The aggregator used to be one n8n webhook (/twu-readout-data) that held
// every GHL contact + opportunity + app-adoption row in memory for a single
// execution, which is what was causing "Connection lost" / deactivation
// under load. Split into two independent, lighter n8n workflows that never
// share memory: lead gen (contacts + opportunities) and app adoption
// (a separate GHL location entirely - never depended on lead gen data).
// Fetched in parallel here and merged into the same Readout shape every
// other file in this app already expects, so nothing downstream changes.
export async function getReadout(): Promise<{ data: Readout | null; error: string | null; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  try {
    const [lgRes, aaRes] = await Promise.all([
      fetch(`${BASE}/twu-readout-leadgen`, { next: { revalidate: 30 } }),
      fetch(`${BASE}/twu-readout-appadoption`, { next: { revalidate: 30 } }),
    ]);
    if (!lgRes.ok) return { data: null, error: `Lead gen source responded ${lgRes.status}`, fetchedAt };
    if (!aaRes.ok) return { data: null, error: `App adoption source responded ${aaRes.status}`, fetchedAt };

    const lgJsonRaw = await lgRes.json();
    const aaJsonRaw = await aaRes.json();
    const lg = Array.isArray(lgJsonRaw) ? lgJsonRaw[0] : lgJsonRaw;
    const aa = Array.isArray(aaJsonRaw) ? aaJsonRaw[0] : aaJsonRaw;

    // The only fields that ever needed BOTH datasets - everything else is
    // already fully computed inside whichever of the two webhooks owns it.
    const summary = { ...lg.summary, ...aa.summary };
    summary.total_email_replied = (lg.lead_gen?.email_replied || 0) + (aa.app_adoption?.stage_replied || 0);
    summary.total_emails_sent =
      (lg.lead_gen?.email_outreach_sent || 0) +
      (aa.app_adoption?.email_outreach_confirmed || 0) +
      (aa.app_adoption?.followup_confirmed || 0);

    const data: Readout = {
      meta: {
        dashboard: "TWU · The Readout",
        generated_at: new Date().toISOString(),
        version: "v1.0-split",
        data_freshness: {
          lead_gen: "live — GHL contacts API (split workflow)",
          app_adoption: "live — GHL opportunities + MongoDB (split workflow, independent of lead gen)",
          ...(lg.meta?.data_freshness || {}),
        },
      },
      lead_gen: lg.lead_gen,
      lead_sources_raw: lg.lead_sources_raw,
      lead_sources_failed: lg.lead_sources_failed,
      lead_sources_drafts: lg.lead_sources_drafts,
      lead_sources_enriched: lg.lead_sources_enriched,
      app_adoption: aa.app_adoption,
      geo_distribution: lg.geo_distribution,
      data_integrity: lg.data_integrity,
      reply_breakdown: lg.reply_breakdown,
      alt_email_outreach: lg.alt_email_outreach,
      ig_bridge_outreach: lg.ig_bridge_outreach,
      temp_away_pause_resume: lg.temp_away_pause_resume,
      summary,
    };

    return { data, error: null, fetchedAt };
  } catch (e: any) {
    return { data: null, error: e?.message || "Readout unreachable", fetchedAt };
  }
}

// Safe deep getter used by the config-driven metric binding.
export function pick(obj: any, path: string): number | string | null {
  const v = path.split(".").reduce((a: any, k: string) => (a == null ? a : a[k]), obj);
  return v == null ? null : v;
}
