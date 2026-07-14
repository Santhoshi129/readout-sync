// lib/contract.ts
// The pure data contract: the Readout payload types and the dot-path getter.
// This file has ZERO server dependencies so client components can import it
// safely. All Mongo/fetch logic lives in lib/readout.ts, which client
// components must never import (it pulls in the Node-only mongodb driver).

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
    ig_outreach_ready_and_sent: number;
    ig_outreach_sent: number;
    ig_outreach_sent_only: number;
    ig_needs_review: number;
    ig_needs_review_not_sent: number;
    ig_duplicate_matched: number;
    ig_sent_no_handle: number;
    ig_replied_positive: number;
    ig_replied_negative: number;
    replied_contacts: { name: string; time: string; channel: string; touch: number | null }[];
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
    stage_alt_outreaching: number;
    total_in_pipeline: number;
    email_reply_rate_pct: number;
    pipeline_responded_share_pct: number;
    replied_at_touch: { touch_1: number; touch_2: number; touch_3: number; touch_4: number; touch_5: number; unattributed: number };
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
    recently_sent: { name: string; sent_at: string }[];
    recently_replied: { name: string; replied_at: string }[];
  };
  geo_distribution: { label: string; count: number; names: string[] }[];
  franchise_mix: { independent: number; f45: number; orangetheory: number; shred415: number; total_franchise: number };
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

// Safe deep getter used by the config-driven metric binding.
export function pick(obj: any, path: string): number | string | null {
  const v = path.split(".").reduce((a: any, k: string) => (a == null ? a : a[k]), obj);
  return v == null ? null : v;
}
