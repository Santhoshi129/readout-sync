// lib/flows.ts
// The registry. Each flow: two-lens analysis, go-live date, LIVE metric bindings
// (paths into the Readout - never hardcoded values), a System Updates changelog
// derived from node-level code inspection, health canaries, and tag notes where
// they genuinely add value. Status words are literal: done / in-progress /
// monitoring / gap. Nothing is marked done unless it ships in the exported nodes.

export type MetricFlag = "cached" | "not-instrumented" | "canary" | "live";
export interface Metric {
  label: string;
  path: string;         // dot-path into the Readout payload
  flag?: MetricFlag;    // default "live"
  note?: string;
  suffix?: string;
}
export interface ChartSpec {
  kind: "funnel" | "ring" | "bars";
  title: string;
  // funnel/bars: series of { label, path, color? }; ring: value + total paths
  series?: { label: string; path: string; tone?: "cold" | "warm" | "hot" | "amber" | "muted" | "bad" }[];
  valuePath?: string;
  totalPath?: string;
  centerLabel?: string;
}
export interface ChangeEntry {
  date: string; // ISO
  status: "done" | "in-progress" | "monitoring" | "gap";
  text: string;
}
export interface Canary {
  label: string;
  path: string;      // into data_integrity or a block
  expect: string;    // e.g. "≈ 0"
}
export interface TagNote { tag: string; why: string }

export interface Flow {
  slug: string;
  name: string;
  order: number;
  goLive: string;        // ISO
  category: "acquisition" | "adoption" | "signal" | "hygiene" | "platform";
  oneLine: string;
  technical: string[];
  business: string[];
  metrics: Metric[];
  charts: ChartSpec[];
  changelog: ChangeEntry[];
  canaries?: Canary[];
  tagNotes?: TagNote[];
  freshnessKeys?: string[]; // which meta.data_freshness keys back this flow
}

export const FLOWS: Flow[] = [
  {
    slug: "lead-gen",
    name: "Lead Gen Pipeline",
    order: 1,
    goLive: "2026-05-25",
    category: "acquisition",
    oneLine: "Turns pre-scraped cold gyms into scored, deduped, personally-drafted prospects - CrossFit at 7:00 AM, HYROX at 7:30 AM.",
    technical: [
      "Two parallel pipelines read pre-scraped gyms (CrossFit from MongoDB cf_gym_details, HYROX from the Raw Leads sheet), fetch each gym's website, and run Claude Haiku enrichment for owner name, gym type, a location-specific Instagram handle (franchise HQ handles rejected) and an outreach angle.",
      "A prospect score gates the pipeline: direct email +35, generic +12, generic-domain −15, US/CA +20, independent +20, franchise −5, website +10, phone +5. Hot ≥65, warm 20–64, cold <20 (skipped and logged). This is read straight from the CF/HY Prospect Score nodes.",
      "Survivors are deduped against GHL by email before any contact is created, pushed to GHL (New Leads → Prospect stage, assigned to Dave) with a personalized Gmail draft in David's voice. Nothing sends automatically.",
    ],
    business: [
      "This is the top of the funnel. Cold gym names go in; ready-to-send, personalized outreach comes out - each one specific to that gym, never generic.",
      "It protects quality two ways: it scores every gym so only worthwhile ones get worked, and it checks GHL first so the same gym is never contacted twice.",
      "David's only job at this stage is to review drafts and hit send. The research and writing are already done.",
    ],
    metrics: [
      { label: "Total scraped", path: "lead_sources_raw.combined_scraped" },
      { label: "Processed", path: "lead_sources_raw.combined_processed", note: "Out of this scrape's queue - not the same number as total CRM contacts below, which includes every past run." },
      { label: "Pending", path: "lead_sources_raw.combined_pending" },
      { label: "Drafts created", path: "lead_sources_drafts.total_drafts_created" },
      { label: "No email (skipped)", path: "lead_sources_failed.total_no_email" },
      { label: "Duplicates skipped", path: "lead_sources_failed.total_duplicates_skipped" },
      { label: "In GHL - CrossFit", path: "lead_gen.crossfit_contacts_in_ghl" },
      { label: "In GHL - HYROX", path: "lead_gen.hyrox_contacts_in_ghl" },
      { label: "Hot leads", path: "lead_sources_enriched.combined_hot" },
      { label: "Warm leads", path: "lead_sources_enriched.combined_warm" },
    ],
    charts: [
      {
        kind: "bars",
        title: "CrossFit vs HYROX: scraped to drafted",
        series: [
          { label: "CF scraped", path: "lead_sources_raw.cf_scraped", tone: "cold" },
          { label: "CF drafts", path: "lead_sources_drafts.cf_drafts_created", tone: "amber" },
          { label: "HY scraped", path: "lead_sources_raw.hy_scraped", tone: "cold" },
          { label: "HY drafts", path: "lead_sources_drafts.hy_drafts_created", tone: "amber" },
        ],
      },
    ],
    changelog: [
      { date: "2026-05-25", status: "done", text: "Went live. Dual CF/HY pipelines, Haiku enrichment, prospect scoring, GHL dedup-before-create, draft-only output." },
      { date: "2026-05-25", status: "monitoring", text: "Avg prospect score is still served from cache - not a GHL field, its source needs confirming. Hot/warm leads and direct-vs-generic email are now computed live per source (hot/warm from tag intersection, direct/generic from the Email Status custom field)." },
    ],
    tagNotes: [
      { tag: "prospect · new lead", why: "Marks a fresh, un-worked gym entering the pipeline." },
      { tag: "crossfit / hyrox", why: "Routes the contact to the right sequence and reporting split downstream." },
      { tag: "independent", why: "No franchise affiliation - scores higher as a prospect than a franchise location." },
      { tag: "f45-franchise / orangetheory-franchise / shred415-franchise", why: "Franchise affiliation detected during enrichment; scores lower and powers the franchise-vs-independent split." },
      { tag: "hot / warm", why: "The prospect score band itself, written straight to the contact - hot is 65+, warm is 20-64. Cold gyms never reach GHL." },
      { tag: "draft-ready", why: "Signals a Gmail draft exists and is waiting on David - the hand-off point to Dave Approval." },
    ],
    freshnessKeys: ["lead_sources_raw", "lead_sources_drafts", "lead_sources_failed", "lead_sources_enriched"],
  },

  {
    slug: "dave-approval",
    name: "Dave Approval Handler",
    order: 2,
    goLive: "2026-05-25",
    category: "signal",
    oneLine: "Watches David's Sent folder every minute and records what he actually sent, so follow-ups are timed correctly.",
    technical: [
      "A Gmail trigger polls in:sent every minute, re-fetches message labels (the trigger payload sometimes omits custom labels), and confirms an outreach email via Label_1–4 (CF Direct/Generic, HY Direct/Generic). Anything unlabeled is ignored.",
      "It looks the recipient up in GHL, branches on whether outreach-sent already exists, and writes the touch number, sent date, thread ID and message ID to custom fields - advancing the contact through the sequence.",
      "First touch adds outreach-sent + touch-1 and removes draft-ready; follow-ups increment the step (max 5), swap the touch-N-pending / followup-draft-ready tags for touch-N. It sends nothing - it only records what David sent.",
    ],
    business: [
      "This is the bridge between David hitting send and the system knowing about it. Without it, follow-up timing would drift.",
      "The moment David sends, the record updates itself - no manual logging, no spreadsheet.",
    ],
    metrics: [
      { label: "Emails sent (all)", path: "summary.total_emails_sent", note: "lead_gen.email_outreach_sent + app_adoption.email_outreach_confirmed + app_adoption.followup_confirmed - every confirmed send across both the TWU cold outreach and Blended member outreach systems, combined." },
      { label: "Outreach sent (lead gen)", path: "lead_gen.email_outreach_sent", note: "Count of GHL contacts carrying the outreach-sent tag - the exact tag this workflow applies the moment it confirms a first-touch email in David's Sent folder." },
      { label: "In active sequence", path: "lead_gen.touch_sequence.in_sequence", note: "Contacts whose Outreach Step custom field reads 1-5 - still inside the 5-touch sequence, not yet finished or stopped." },
    ],
    charts: [
      {
        kind: "bars",
        title: "Touch distribution (where contacts sit in the 5-touch sequence)",
        series: [
          { label: "Touch 1", path: "lead_gen.touch_sequence.step_1", tone: "cold" },
          { label: "Touch 2", path: "lead_gen.touch_sequence.step_2", tone: "cold" },
          { label: "Touch 3", path: "lead_gen.touch_sequence.step_3", tone: "warm" },
          { label: "Touch 4", path: "lead_gen.touch_sequence.step_4", tone: "warm" },
          { label: "Touch 5", path: "lead_gen.touch_sequence.step_5", tone: "amber" },
        ],
      },
    ],
    changelog: [
      { date: "2026-05-25", status: "done", text: "Live alongside Lead Gen. Every-minute sent detection, label re-fetch, first-touch vs follow-up paths." },
    ],
    tagNotes: [
      { tag: "outreach-sent", why: "The single source of truth that a real email left David's account - everything downstream keys off it." },
      { tag: "touch-1 … touch-5", why: "Encodes exactly which touch a contact is on so the sequencer knows what to draft next." },
    ],
  },

  {
    slug: "cold-outreach",
    name: "Cold Outreach Sequencer",
    order: 3,
    goLive: "2026-05-28",
    category: "acquisition",
    oneLine: "Every morning at 8:15, drafts the next due touch for active gyms and stops the sequence the instant one replies.",
    technical: [
      "Daily at 8:15 AM it loads GHL field definitions, fetches contacts, and filters to genuinely active outreach: has outreach-sent, not replied / complete / bounced / stopped / draft-pending (draft-pending = followup-draft-ready, the same tag the resume flow uses to avoid double-drafting).",
      "For each active contact it checks days-since-last-send (≥2 = due) and current touch. Due contacts get a Claude draft in David's voice using the touch-specific angle; touch 5 with no reply closes out with no-response + sequence-complete + phone-ig-followup.",
      "A separate inbox branch stops a sequence the moment a gym replies and alerts Slack. Nothing sends automatically.",
    ],
    business: [
      "This keeps the conversation going without anyone remembering to follow up. Each gym gets up to five nudges, spaced out, each written fresh.",
      "The second a gym replies, the nudging stops - no awkward 'did you get my email' after they've already answered.",
      "Gyms that go all five touches with silence are handed off for a phone or Instagram try instead of being dropped.",
    ],
    metrics: [
      { label: "Reply rate", path: "lead_gen.email_reply_rate_pct", suffix: "%" },
      { label: "Replied", path: "lead_gen.email_replied" },
      { label: "Sequence complete", path: "lead_gen.sequence_complete" },
      { label: "Responded (stage)", path: "lead_gen.stage_responded" },
      { label: "No response (stage)", path: "lead_gen.stage_no_response" },
      { label: "Dead (stage)", path: "lead_gen.stage_dead" },
    ],
    charts: [
      {
        kind: "bars",
        title: "Pipeline stage distribution",
        series: [
          { label: "New lead", path: "lead_gen.stage_new_lead", tone: "cold" },
          { label: "Responded", path: "lead_gen.stage_responded", tone: "amber" },
          { label: "No response", path: "lead_gen.stage_no_response", tone: "muted" },
          { label: "Dead", path: "lead_gen.stage_dead", tone: "bad" },
          { label: "IG outreach", path: "lead_gen.stage_ig_outreach", tone: "warm" },
        ],
      },
    ],
    changelog: [
      { date: "2026-05-28", status: "done", text: "Live three days after Lead Gen. 5-touch sequencer, ≥2-day cadence, inbox stop-on-reply, T5 hand-off to phone/IG." },
      { date: "2026-06-26", status: "done", text: "Reply handling moved to the dedicated Reply Detector (classification + temp-away pausing)." },
    ],
    tagNotes: [
      { tag: "touch-N-pending / followup-draft-ready", why: "The next touch is drafted in Gmail but not yet sent - also the tag Temp Away checks to avoid double-drafting a contact." },
      { tag: "phone-ig-followup", why: "David's signal that email is exhausted - hand this gym to the IG/Phone flow." },
      { tag: "sequence-complete", why: "Freezes the contact so neither the sequencer nor a resume can re-draft it." },
      { tag: "sequence-stopped", why: "Written the instant a reply arrives, halting further touches immediately." },
    ],
    canaries: [
      { label: "Stuck draft tags", path: "data_integrity.stuck_draft_tags", expect: "≈ 0" },
      { label: "Step / tag mismatch", path: "data_integrity.step_tag_mismatch", expect: "≈ 0" },
    ],
  },

  {
    slug: "app-adoption",
    name: "App Adoption Outreach",
    order: 4,
    goLive: "2026-06-13",
    category: "adoption",
    oneLine: "Finds existing members who aren't on the TWU app yet, drafts a personal invite, and tracks every outcome to joined-or-not.",
    technical: [
      "Tuesday 8:00 AM: pulls ZP members not yet on the app, filters out drop-ins / missing emails / duplicates / already-contacted, drafts up to four Gmail invites, logs each to MongoDB + Sheets, and opens an App Adoption pipeline card.",
      "A reply processor (same session) classifies member replies into opted-out / adopted / other and moves the GHL card accordingly; a tag webhook listens for outreach-sent and app-not-joining that David sets manually.",
      "Adoption rate = (adopted + already-on-app) ÷ total identified, computed live from the deduped MongoDB tracker.",
    ],
    business: [
      "Your members are worth more when they're inside the community app. This flow works the gap between 'is a member' and 'is on the app.'",
      "It's the 325-of-854 story from the app: a room that's filling up, tracked member by member - joined, opted out, or still to decide.",
    ],
    metrics: [
      { label: "Identified", path: "app_adoption.total_identified" },
      { label: "Total joined", path: "app_adoption.total_joined" },
      { label: "Adopted via outreach", path: "app_adoption.adopted" },
      { label: "Already on app", path: "app_adoption.already_on_app" },
      { label: "Opted out", path: "app_adoption.opted_out" },
      { label: "No response", path: "app_adoption.no_response" },
      { label: "Needs Dave review", path: "app_adoption.needs_dave_review" },
      { label: "Not joining (confirmed)", path: "app_adoption.not_joining_confirmed" },
    ],
    charts: [
      {
        kind: "ring",
        title: "Adoption rate",
        valuePath: "app_adoption.total_joined",
        totalPath: "app_adoption.total_identified",
        centerLabel: "joined",
      },
    ],
    changelog: [
      { date: "2026-06-13", status: "done", text: "Live. Tuesday draft queue, reply processor, weekly Slack summary, GHL tag webhook (outreach-sent / app-not-joining)." },
      { date: "2026-06-19", status: "done", text: "Follow-up, weekly summary and no-response sweeps split into their own flow (see Follow-up / Summary)." },
    ],
    tagNotes: [
      { tag: "zp-member / app-adoption-outreach", why: "Confirms the contact is a real Zen Planner member and marks them as part of this program." },
      { tag: "outreach-draft-ready", why: "Invite drafted in Gmail and waiting on David to send - the hand-off point for this flow." },
      { tag: "outreach-sent / app-not-joining", why: "Set on the incoming tag webhook - outreach-sent confirms the send, app-not-joining is David's manual signal that a member has declined." },
    ],
    canaries: [
      { label: "No-email (Mongo vs Sheet)", path: "app_adoption.no_email_mongo_count", expect: "should track sheet count" },
    ],
  },

  {
    slug: "followup-summary",
    name: "Follow-up / Summary / No-Response",
    order: 5,
    goLive: "2026-06-19",
    category: "adoption",
    oneLine: "The rhythm around App Adoption: Friday follow-up drafts, Tuesday stats to Slack, Monday no-response cleanup.",
    technical: [
      "Branch C (Fri 8:00 AM): finds members who got the first email but haven't replied after 4+ days and drafts up to four threaded follow-ups; updates MongoDB / Sheets / GHL stage.",
      "Branch D (Tue 8:45 AM): reads the full MongoDB tracker and posts all-time + this-week stats to Slack. Branch E (Mon): marks members with no reply 4+ days after follow-up as no_response and moves the GHL card.",
    ],
    business: [
      "This is what keeps the adoption push from going stale: one polite nudge, a weekly scoreboard, and automatic cleanup of the ones who've gone quiet.",
      "David gets a Slack readout every week without asking, and the pipeline stays honest - silent members don't clog the 'in progress' column.",
    ],
    metrics: [
      { label: "Follow-up drafts waiting", path: "app_adoption.followup_draft_in_gmail" },
      { label: "Follow-up confirmed sent", path: "app_adoption.followup_confirmed" },
      { label: "In follow-up stage", path: "app_adoption.stage_followup" },
      { label: "No-response stage", path: "app_adoption.stage_no_response" },
    ],
    charts: [
      {
        kind: "bars",
        title: "Adoption pipeline stages",
        series: [
          { label: "Drafted", path: "app_adoption.stage_drafted", tone: "cold" },
          { label: "Sent", path: "app_adoption.stage_sent", tone: "warm" },
          { label: "Follow-up", path: "app_adoption.stage_followup", tone: "warm" },
          { label: "Replied", path: "app_adoption.stage_replied", tone: "amber" },
          { label: "Adopted", path: "app_adoption.stage_adopted", tone: "hot" },
          { label: "No response", path: "app_adoption.stage_no_response", tone: "muted" },
        ],
      },
    ],
    changelog: [
      { date: "2026-06-19", status: "done", text: "Split out of App Adoption. Friday follow-up, Tuesday summary, Monday no-response sweep all live." },
    ],
    tagNotes: [
      { tag: "followup-draft-ready", why: "A follow-up invite is drafted in Gmail, waiting on David to send." },
      { tag: "no_response", why: "Written by the Monday cleanup for members who stayed silent 4+ days after the follow-up - keeps the pipeline from filling with stale 'in progress' cards." },
    ],
  },

  {
    slug: "reply-detector",
    name: "Reply Detector",
    order: 6,
    goLive: "2026-06-26",
    category: "signal",
    oneLine: "Reads every inbound reply, classifies intent with Claude, and routes it - including auto-responder redirects to Alt Email.",
    technical: [
      "Every-minute inbox trigger parses the sender, fetches the original thread, and asks Claude to classify: interested, not_interested, auto_responder, auto_ack, temporary_away, or other. Unknown labels fall back to 'other' so nothing slips past a human.",
      "Interested → tag interested + sequence-stopped, move to Responded. Not-interested → unsubscribed + sequence-stopped, move to Dead. Auto-responder redirect → hands off to Alt Email Outreach. Temporary-away → writes temporarily-paused + paused-source-coldoutreach + paused-until-<date> (this is where Cold Outreach pausing actually happens).",
      "Auto-ack is intentionally passive - no stage change, sequence keeps running. In the current export the Handle Auto-Ack node writes no tag, so reply_breakdown.auto_ack reads 0 until the auto-ack-detected tag write is deployed.",
    ],
    business: [
      "Not every reply means the same thing. This tells 'yes, interested' apart from 'please stop,' from a robot 'we're closed until Monday.'",
      "It reacts instantly and correctly: interested gets flagged for David, not-interested is closed out, and an out-of-office quietly pauses the sequence until they're back.",
    ],
    metrics: [
      { label: "Interested", path: "reply_breakdown.interested" },
      { label: "Not interested", path: "reply_breakdown.not_interested" },
      { label: "Auto-responder", path: "reply_breakdown.auto_responder" },
      { label: "Auto-ack", path: "reply_breakdown.auto_ack", flag: "not-instrumented", note: "Handle Auto-Ack writes no tag in the current export - reads 0 until the auto-ack-detected write is deployed." },
      { label: "Other (needs review)", path: "reply_breakdown.other" },
      { label: "Total classified", path: "reply_breakdown.total_classified" },
    ],
    charts: [
      {
        kind: "bars",
        title: "Reply classification mix",
        series: [
          { label: "Interested", path: "reply_breakdown.interested", tone: "hot" },
          { label: "Not interested", path: "reply_breakdown.not_interested", tone: "bad" },
          { label: "Auto-responder", path: "reply_breakdown.auto_responder", tone: "warm" },
          { label: "Other", path: "reply_breakdown.other", tone: "muted" },
        ],
      },
    ],
    changelog: [
      { date: "2026-06-26", status: "done", text: "Live as the dedicated classifier for cold-outreach replies. Six-way intent classification, temp-away pausing, Alt Email hand-off." },
      { date: "2026-06-26", status: "gap", text: "Auto-ack counting: Handle Auto-Ack writes no tag. Drop-in fix ready (adds auto-ack-detected, no stage change) - not yet confirmed deployed." },
    ],
    tagNotes: [
      { tag: "interested / unsubscribed", why: "The two hard outcomes that stop the sequence and move the card." },
      { tag: "auto-responder-detected", why: "An auto-reply redirected us to another address - the trigger that hands the contact to Alt Email Outreach." },
      { tag: "auto-ack-detected", why: "Would mark a pure acknowledgement with no stage change - not yet written in the deployed export, which is why auto_ack reads 0 above (see changelog)." },
      { tag: "replied / replied-at-touch-N", why: "Records a real reply against the exact touch that earned it." },
      { tag: "temporarily-paused + paused-source-coldoutreach", why: "Pauses an out-of-office contact and records which flow to resume it into." },
    ],
  },

  {
    slug: "ig-tag-handler",
    name: "IG & Phone Tag Handler",
    order: 7,
    goLive: "2026-06-28",
    category: "signal",
    oneLine: "Turns David's manual reply tags (IG or phone) into the right CRM moves - the two tags he adds trigger everything else.",
    technical: [
      "Two webhooks. IG positive replies are routed through Claude first (genuine vs auto-reply, and it captures a redirect email if present) - if an email is found it's written and the stage is held so the IG Bridge Sequence can pick it up; genuine-no-email moves to Responded + sequence-stopped.",
      "Phone: phone-positive → Responded + sequence-stopped + phone-resolved; phone-negative → Dead + sequence-stopped + phone-resolved. Writing phone-resolved is what makes phone_still_due (open right now) distinct from the lifetime phone_followup_due total.",
      "Also writes paused-source-igmain, covering the fourth pause source in the unified temp-away system.",
    ],
    business: [
      "David only ever adds two tags after an Instagram or phone conversation - positive or negative. The system does the rest of the CRM work.",
      "It's smart about Instagram: a positive IG reply that hands over an email address quietly starts the email bridge sequence instead of ending the conversation.",
    ],
    metrics: [
      { label: "IG replied positive", path: "lead_gen.ig_replied_positive" },
      { label: "IG replied negative", path: "lead_gen.ig_replied_negative" },
      { label: "Phone positive", path: "lead_gen.phone_positive" },
      { label: "Phone negative", path: "lead_gen.phone_negative" },
      { label: "Phone resolved", path: "lead_gen.phone_resolved" },
      { label: "Phone still due", path: "lead_gen.phone_still_due" },
    ],
    charts: [
      {
        kind: "bars",
        title: "Phone outcomes",
        series: [
          { label: "Positive", path: "lead_gen.phone_positive", tone: "hot" },
          { label: "Negative", path: "lead_gen.phone_negative", tone: "bad" },
          { label: "Called only", path: "lead_gen.phone_called_only", tone: "warm" },
          { label: "Still due", path: "lead_gen.phone_still_due", tone: "amber" },
        ],
      },
    ],
    changelog: [
      { date: "2026-06-28", status: "done", text: "Live. IG positive routed through Claude (email capture → hand to Bridge), phone tags close with phone-resolved." },
    ],
    tagNotes: [
      { tag: "ig-replied-positive / ig-replied-negative", why: "David's manual outcome tag on an IG reply - the two entry points this whole flow reacts to." },
      { tag: "phone-positive / phone-negative", why: "David's manual outcome tag on a phone call - routed to Responded or Dead Lead." },
      { tag: "phone-resolved", why: "Marks a phone stage closed regardless of outcome - powers the 'actually open right now' phone number." },
      { tag: "ig-email-captured", why: "A redirect email arrived via IG - the trigger the Bridge Sequence waits for." },
      { tag: "source-instagram", why: "Marks that a captured redirect email came from IG rather than an email auto-responder, so reporting can tell the two hand-offs apart." },
    ],
  },

  {
    slug: "ig-phone-outreach",
    name: "IG & Phone Outreach",
    order: 8,
    goLive: "2026-06-28",
    category: "acquisition",
    oneLine: "For email-exhausted gyms: finds a real Instagram handle to DM, then flags a phone call if the DM goes cold.",
    technical: [
      "Daily 9:30 AM, two parallel branches. IG: for gyms tagged phone-ig-followup, searches Google via Apify and asks Claude to classify the handle as ig-direct (location-specific, passes), ig-generic (brand HQ, rejected) or ig-not-found. Direct → ig-outreach-ready + a Mary task; generic/not-found → ig-needs-review. Capped at 20/day for IG safety.",
      "Phone: fully-paginated fetch of ig-outreach-sent contacts (the old limit=100 single request dropped contacts past 100). NEW = 10+ days since real IG send, gets a task + phone-followup-due; STALE = already due, no reply 7+ days - resurfaces in the daily Slack digest so a backlog can't vanish.",
    ],
    business: [
      "Email isn't the only door. When a gym never answers email, this finds their real Instagram and queues a DM - and only the real location page, never the corporate brand account.",
      "If the DM also goes quiet, it puts a phone call on David's list and keeps reminding him until it's done, so nobody falls through the cracks.",
    ],
    metrics: [
      { label: "IG ready to send (backlog)", path: "lead_gen.ig_outreach_ready", note: "ig-outreach-ready contacts NOT also tagged ig-outreach-sent - the real still-waiting queue." },
      { label: "IG DMs sent", path: "lead_gen.ig_outreach_sent" },
      { label: "Needs review (generic/not-found)", path: "lead_gen.ig_needs_review", note: "ig-needs-review - covers both generic/brand-HQ handles and no-handle-found; this flow doesn't tag those two cases differently." },
      { label: "Phone follow-up due (lifetime)", path: "lead_gen.phone_followup_due" },
      { label: "Phone still due (open now)", path: "lead_gen.phone_still_due" },
    ],
    charts: [
      {
        kind: "funnel",
        title: "IG → phone hand-off",
        series: [
          { label: "IG ready", path: "lead_gen.ig_outreach_ready", tone: "cold" },
          { label: "IG DMs sent", path: "lead_gen.ig_outreach_sent", tone: "warm" },
          { label: "Phone due", path: "lead_gen.phone_followup_due", tone: "amber" },
          { label: "Still due", path: "lead_gen.phone_still_due", tone: "hot" },
        ],
      },
    ],
    changelog: [
      { date: "2026-06-28", status: "done", text: "IG branch live: Apify handle lookup + Claude classification, brand-HQ rejection, Mary tasks." },
      { date: "2026-07-05", status: "done", text: "Phone branch live with fully-paginated fetch (fixed the limit=100 drop) and NEW/STALE bucketing in one Slack digest." },
    ],
    tagNotes: [
      { tag: "ig-outreach-ready / ig-needs-review", why: "Splits confirmed location handles (ready to DM) from ones a human must find first." },
      { tag: "ig-direct / ig-generic", why: "Claude's classification of the found handle - gym-specific and usable, versus a rejected brand-HQ account." },
      { tag: "ig-outreach-sent", why: "Mari has DM'd this gym on Instagram - written manually once the DM actually goes out." },
      { tag: "phone-followup-due", why: "Puts the gym on the call list; cleared only by a phone/IG outcome tag." },
      { tag: "phone-called", why: "A call was made but the outcome isn't recorded yet - written manually, then closed out by phone-positive/negative in the Tag Handler." },
    ],
  },

  {
    slug: "the-readout",
    name: "The Readout",
    order: 9,
    goLive: "2026-06-30",
    category: "platform",
    oneLine: "The live backend behind this dashboard - one aggregation API (v9.0) that reads GHL, MongoDB and Sheets in parallel.",
    technical: [
      "A single code node fans out ~25 parallel fetches - GHL contacts (paginated) + opportunity stage counts across both pipelines, MongoDB app-adoption, and several Sheets/Mongo sub-webhooks - and assembles one structured payload behind /twu-readout-data.",
      "It self-documents freshness per block in meta.data_freshness (live vs cached), and carries a data_integrity block of canaries computed directly from GHL tags/fields with no external system.",
      "v9.0 added resume_sequence_exhausted (closing the temp-away gap). Enrichment breakdown remains cached by design; every other block is live per read.",
    ],
    business: [
      "This is the single source of truth. Every number on this dashboard comes from here, fetched fresh - nothing is typed in by hand.",
      "It also grades its own honesty: it tells you which numbers are live and which are cached, and runs seven self-checks that should all read near zero on a healthy system.",
    ],
    metrics: [
      { label: "Version", path: "meta.version" },
      { label: "Total contacts in GHL", path: "lead_gen.total_contacts_in_ghl" },
      { label: "Total in pipeline", path: "lead_gen.total_in_pipeline" },
      { label: "Emails sent (all)", path: "summary.total_emails_sent" },
      { label: "Total joined", path: "app_adoption.total_joined" },
    ],
    charts: [],
    changelog: [
      { date: "2026-06-30", status: "done", text: "Live as the aggregation API. 11 endpoints, parallel fetch, per-block freshness map, integrity canaries." },
      { date: "2026-07-08", status: "done", text: "v9.0: added temp_away_pause_resume.resume_sequence_exhausted (+ by-source), mirrored to summary and documented in data_freshness." },
      { date: "2026-06-30", status: "monitoring", text: "lead_sources_enriched (hot/warm/avg-score/email-split) stays cached - refreshes when enrichment runs, not per read." },
    ],
    canaries: [
      { label: "Stuck draft tags", path: "data_integrity.stuck_draft_tags", expect: "≈ 0" },
      { label: "Step / tag mismatch", path: "data_integrity.step_tag_mismatch", expect: "≈ 0" },
      { label: "IG unmatched duplicates", path: "data_integrity.ig_unmatched_duplicates", expect: "low" },
      { label: "IG bridge stuck pending", path: "data_integrity.ig_bridge_stuck_pending", expect: "watch - label collision" },
      { label: "Stuck past resume date", path: "data_integrity.stuck_past_resume_date", expect: "≈ 0" },
      { label: "Missing resume date", path: "data_integrity.missing_resume_date", expect: "≈ 0" },
      { label: "Legacy IG-bridge tag", path: "data_integrity.legacy_ig_bridge_stuck_tag", expect: "→ 0 (migrate)" },
    ],
  },

  {
    slug: "retention-watch",
    name: "Retention Watch",
    order: 10,
    goLive: "2026-07-04",
    category: "adoption",
    oneLine: "Daily 7:00 AM scan of every member, split into never-linked-the-app and linked-both, checked against 4 alert conditions and batched into one alert.",
    technical: [
      "Daily Trigger fires once at 7am and calls /community/member-overlap once, which returns three groups: in_zp_not_app, in_app_not_zp, in_both. Only the first and third are used - in_app_not_zp (app users with no active gym membership) are deliberately skipped, since they're not retention or outreach targets.",
      "Build Member List explodes that single response into one item per member, tagging each with stream: not_on_app or stream: in_both, and drops any not_on_app member with no email on file (can't message them anyway). Which Stream? then forks every member down exactly one path.",
      "Stream A (not_on_app) has no profile_id, so no engagement call is possible - the alert is built directly from the overlap record's membership_status and membership_type, always priority 5 (lowest urgency), always app_engagement: null.",
      "Stream B (in_both) calls GET /users/{profile_id}/engagement per member, then Check Alert Conditions tests 4 conditions in priority order, first match wins: snapshot_pending (no analytics yet) - at_risk - needs_attention - attendance_drop (7+ days since last visit). No match means alert_type: none, filtered out downstream. Every real alert here carries full app_engagement, attendance_history, and membership_context blocks, plus a dates_invalid flag when a Zen Planner record's end_date is before its begin_date.",
      "Merge Alerts combines both streams; Has Alert? drops the none items. Build Batch Payload then dedupes by profile_id (a handful of Zen Planner records share one app profile under different IDs - keeps only the highest-priority alert per person), builds an alerts_by_type count breakdown, and wraps it all with run_completed_at + alert_count.",
      "Send Alerts fires exactly once per daily run - one batched POST, never one request per member. It currently points at a test n8n webhook for inspecting payloads; swapping that URL for the real TWU intervention endpoint is the last step before this delivers real alerts.",
      "Not represented in The Readout payload yet, so it has no live tiles on this dashboard - flagged rather than faked.",
    ],
    business: [
      "This is the early-warning system for churn: it spots members going quiet before they leave, across both people who never linked the app and people who did but stopped showing up.",
      "The detection logic is done and running daily against real data. The only thing standing between this and being useful is the last wire: pointing Send Alerts at the real TWU endpoint instead of the test inbox it's aimed at today.",
    ],
    metrics: [],
    charts: [],
    changelog: [
      { date: "2026-07-04", status: "done", text: "Live-computing against real app + Zen Planner APIs. 4 alert conditions in priority order: snapshot_pending, at_risk, needs_attention, attendance_drop. Deduped by profile_id, batched into one POST per run." },
      { date: "2026-07-04", status: "gap", text: "Send Alerts still points at a test n8n webhook, not the real TWU intervention endpoint. Not instrumented in The Readout yet." },
    ],
  },


  {
    slug: "alt-email",
    name: "Alt Email Outreaching",
    order: 11,
    goLive: "2026-07-05",
    category: "acquisition",
    oneLine: "When a gym's auto-reply redirects to another address, this restarts outreach there - a fresh draft plus a 3-touch follow-up.",
    technical: [
      "Triggered when the Reply Detector catches an auto-responder redirect. Extracts the alternate email, saves it to the original contact (altmail-sent), drafts fresh outreach in David's voice, applies a CF/HY generic label and captures the thread.",
      "A daily 9 AM job advances a 3-touch sequence (4-day gaps, keyed off confirmed send dates and touch-count, excluding altmail-replied / not-interested). Its own reply handler classifies interested / not-interested / other.",
      "Coverage % = alt-outreach started ÷ auto-responders detected - a gap means some redirects never became attempts.",
    ],
    business: [
      "Auto-replies that say 'email us here instead' used to be dead ends. Now they become live conversations at the right address.",
      "Coverage tells you whether you're capturing those hand-offs or leaking them - the closer to 100%, the fewer redirects fall through.",
    ],
    metrics: [
      { label: "Auto-responders detected", path: "alt_email_outreach.auto_responders_detected" },
      { label: "Alt outreach started", path: "alt_email_outreach.alt_outreach_started" },
      { label: "Coverage", path: "alt_email_outreach.alt_outreach_coverage_pct", suffix: "%" },
      { label: "In Alt Outreaching stage", path: "alt_email_outreach.in_alt_outreaching_stage" },
      { label: "Awaiting reply", path: "alt_email_outreach.awaiting_reply" },
      { label: "Replied", path: "alt_email_outreach.replied" },
      { label: "Interested", path: "alt_email_outreach.interested" },
      { label: "Not interested", path: "alt_email_outreach.not_interested" },
    ],
    charts: [
      {
        kind: "ring",
        title: "Redirect capture coverage",
        valuePath: "alt_email_outreach.alt_outreach_started",
        totalPath: "alt_email_outreach.auto_responders_detected",
        centerLabel: "captured",
      },
    ],
    changelog: [
      { date: "2026-07-05", status: "done", text: "Live. Redirect capture, fresh draft + 3-touch follow-up, coverage %, own reply handler." },
      { date: "2026-07-05", status: "monitoring", text: "Reply-handler end-to-end verification is a runtime property not visible in the export - watch coverage % and replied counts against detections." },
    ],
    tagNotes: [
      { tag: "altmail-replied / altmail-interested / altmail-not-interested", why: "Outcome tags once the alt-channel reply comes back." },
      { tag: "altmail-sent", why: "Marks that outreach restarted at the redirect address - the entry point for this flow's own sequence and reporting." },
    ],
  },

  {
    slug: "ig-bridge",
    name: "IG Bridge Sequence",
    order: 12,
    goLive: "2026-07-07",
    category: "acquisition",
    oneLine: "The 3-touch email sequence for gyms who moved TWU from Instagram to email - with a known label-collision to watch.",
    technical: [
      "Pipeline B (daily 9 AM) drafts touches for contacts with ig-outreach-sent + ig-replied-positive and a captured ig_outreach_email; touch 1 runs fresh Haiku website enrichment, touches 2/3 follow David's reference templates in-thread. Pipeline C classifies replies (interested / not-interested / other).",
      "Pipeline A confirms a send by matching Gmail labels - but it matches BRIDGE_LABEL_IDS = ['Label_1'..'Label_4'], which are the same CF/HY outreach labels used by Dave Approval. The node's own TODO calls them placeholders, but they're real labels shared with normal outreach, so the confirmation can't uniquely identify a bridge send.",
      "That collision is why ig_bridge_stuck_pending (contacts frozen at 'drafted, pending send') is the canary to watch. The exact runtime symptom needs a live check - the number is instrumented for exactly that.",
    ],
    business: [
      "Some gyms say 'DM us your info by email' - this runs that email conversation for them, three well-timed touches, personalized on the first.",
      "There's one known wrinkle: the step that confirms a bridge email was sent shares labels with regular outreach, so some can get stuck as 'drafted but not confirmed sent.' The stuck-pending number tracks exactly that until the labels are separated.",
    ],
    metrics: [
      { label: "Touch 1 sent", path: "ig_bridge_outreach.touch1_sent" },
      { label: "Sequence complete", path: "ig_bridge_outreach.sequence_complete" },
      { label: "Replied interested", path: "ig_bridge_outreach.replied_interested" },
      { label: "Replied not interested", path: "ig_bridge_outreach.replied_not_interested" },
      { label: "Needs review", path: "ig_bridge_outreach.needs_review" },
      { label: "Reply rate", path: "ig_bridge_outreach.reply_rate_pct", suffix: "%" },
      { label: "Stuck pending (canary)", path: "data_integrity.ig_bridge_stuck_pending", flag: "canary", note: "Elevated by the Label_1–4 collision - watch until a dedicated bridge label is assigned." },
    ],
    charts: [
      {
        kind: "funnel",
        title: "Bridge sequence progression",
        series: [
          { label: "Touch 1 sent", path: "ig_bridge_outreach.touch1_sent", tone: "cold" },
          { label: "Complete", path: "ig_bridge_outreach.sequence_complete", tone: "warm" },
          { label: "Interested", path: "ig_bridge_outreach.replied_interested", tone: "hot" },
        ],
      },
    ],
    changelog: [
      { date: "2026-07-07", status: "done", text: "Updated version live. Pipelines A/B/C, touch-1 Haiku enrichment, migrated off the legacy pause tag to temporarily-paused + paused-source-igbridge." },
      { date: "2026-07-07", status: "monitoring", text: "Pipeline A label collision: confirmation matches Label_1–4 (shared with CF/HY outreach). Watch ig_bridge_stuck_pending; fix = assign a dedicated bridge label." },
    ],
    canaries: [
      { label: "IG bridge stuck pending", path: "data_integrity.ig_bridge_stuck_pending", expect: "watch - label collision" },
      { label: "Legacy IG-bridge tag", path: "data_integrity.legacy_ig_bridge_stuck_tag", expect: "→ 0 (migrate)" },
    ],
    tagNotes: [
      { tag: "ig-outreach-sent + ig-replied-positive", why: "The entry condition Pipeline B watches for - a contact only enters the bridge once both are present and an email has been captured." },
      { tag: "ig-alt-outreach-sent", why: "Confirms touch 1 of the bridge sequence actually sent." },
      { tag: "ig-bridge-sequence-complete", why: "All 3 touches ran with no reply - closes the sequence out." },
      { tag: "ig-bridge-replied-interested / ig-bridge-replied-not-interested", why: "Pipeline C's classification of the reply - moves the contact to Responded or Dead Lead." },
      { tag: "temporarily-paused + paused-source-igbridge", why: "How an out-of-office reply on this channel is recorded, so Temp Away knows which sequence to resume it into." },
    ],
  },

  {
    slug: "ig-duplicate",
    name: "IG Duplicate Checker",
    order: 13,
    goLive: "2026-07-07",
    category: "hygiene",
    oneLine: "Re-matches Instagram contacts that couldn't be linked to a master gym record - nightly, against a fuller master pool.",
    technical: [
      "A webhook fires at DM-send time; contacts it can't confidently match to a master gym are tagged ig-review-noted (often because Mary hadn't added the handle yet). A daily 8 PM job re-runs handle → name-fuzzy → substring matching against the now-more-complete master pool.",
      "On a fresh match it stamps the real outreach date, tags ig-outreach-sent + ig-duplicate-matched, removes ig-review-noted and posts one Slack summary. Both pools are fully paginated. On continued failure it does nothing - no repeat alert spam.",
    ],
    business: [
      "It stops the same gym being treated as two, and fixes contacts whose outreach date was recorded wrong because their Instagram handle wasn't on file yet.",
      "The unmatched count is the size of that cleanup backlog - it should trend toward zero as handles get filled in.",
    ],
    metrics: [
      { label: "Unmatched (review backlog)", path: "data_integrity.ig_unmatched_duplicates", flag: "canary", note: "Contacts tagged ig-review-noted whose outreach date may still be stale - trends down as handles are added." },
    ],
    charts: [],
    changelog: [
      { date: "2026-07-07", status: "done", text: "Updated version live. Nightly retry with fuzzy/substring matching, full pagination, one-shot alerts, no spam on repeat failure." },
    ],
    canaries: [
      { label: "IG unmatched duplicates", path: "data_integrity.ig_unmatched_duplicates", expect: "low / trending to 0" },
    ],
    tagNotes: [
      { tag: "ig-review-noted", why: "Stamped at DM-send time when the webhook can't confidently match the contact to a master gym record - the flag this flow works off of every night." },
      { tag: "ig-outreach-sent + ig-duplicate-matched", why: "Written together on a fresh match: confirms the real outreach date and marks the record as reconciled with the master pool." },
    ],
  },

  {
    slug: "temp-away",
    name: "Temp Away & Paused Contacts",
    order: 14,
    goLive: "2026-07-08",
    category: "hygiene",
    oneLine: "The unified pause/resume brain: brings out-of-office contacts back on schedule, across all four outreach flows.",
    technical: [
      "Daily 8:00 AM. Find & Resume strips temporarily-paused + sequence-stopped + paused-until-<date> and adds re-engaged once the date passes, keeping paused-source-<flow> for attribution, then routes by source (coldoutreach / altmail / igbridge / igmain).",
      "Each branch drafts a resume email in-thread and blocks its own sequencer from double-drafting (CO writes followup-draft-ready, the same tag the sequencer skips on). Exhausted-sequence resumes now remove re-engaged and write resume-sequence-exhausted (v9.0 canary) - they stay out of both active pools (CO excludes on sequence-complete, ALT on touch-count ≥ 3).",
      "Two integrity canaries: stuck_past_resume_date (resume job didn't run) and missing_resume_date (paused with no date tag).",
    ],
    business: [
      "When a gym says 'I'm away until the 15th,' this remembers and picks the conversation back up on the 15th - automatically, in the same email thread.",
      "It works the same way no matter which channel paused them, and it won't accidentally double-message anyone or re-start a conversation that already ran its full course.",
    ],
    metrics: [
      { label: "Currently paused", path: "temp_away_pause_resume.total_paused" },
      { label: "Total resumed", path: "temp_away_pause_resume.total_resumed" },
      { label: "Resumed - already exhausted", path: "temp_away_pause_resume.resume_sequence_exhausted", flag: "canary", note: "New in v9.0. Resumed contacts whose sequence was already complete - kept visible and out of active pools." },
      { label: "Stuck past resume date", path: "temp_away_pause_resume.stuck_past_resume_date", flag: "canary" },
      { label: "Missing resume date", path: "temp_away_pause_resume.missing_resume_date", flag: "canary" },
      { label: "Legacy IG-bridge tag", path: "temp_away_pause_resume.legacy_ig_bridge_stuck_tag", flag: "canary" },
    ],
    charts: [
      {
        kind: "bars",
        title: "Paused by source",
        series: [
          { label: "Cold Outreach", path: "temp_away_pause_resume.paused_by_source.coldoutreach", tone: "cold" },
          { label: "Alt Email", path: "temp_away_pause_resume.paused_by_source.altmail", tone: "warm" },
          { label: "IG Bridge", path: "temp_away_pause_resume.paused_by_source.igbridge", tone: "amber" },
          { label: "IG Main", path: "temp_away_pause_resume.paused_by_source.igmain", tone: "hot" },
        ],
      },
    ],
    changelog: [
      { date: "2026-07-08", status: "done", text: "Live. Unified pause/resume across all four flows, in-thread resume drafts, anti-double-draft block, source attribution." },
      { date: "2026-07-08", status: "done", text: "Exhausted-resume now writes resume-sequence-exhausted (removes re-engaged), surfaced in Readout v9.0 - closes the previously-invisible gap." },
      { date: "2026-07-08", status: "monitoring", text: "Legacy ig-bridge-temp-paused contacts won't be picked up (resume reads temporarily-paused only) - need manual migration." },
    ],
    tagNotes: [
      { tag: "re-engaged", why: "Written the moment a paused contact resumes, so it's never picked up twice by the same sweep." },
      { tag: "paused-until-YYYY-MM-DD", why: "The alarm clock - the resume job reads this date to know when to bring a contact back." },
      { tag: "resume-sequence-exhausted", why: "Marks a resumed contact whose sequence was already done, so it stays visible without re-entering an active pool." },
    ],
    canaries: [
      { label: "Stuck past resume date", path: "temp_away_pause_resume.stuck_past_resume_date", expect: "≈ 0" },
      { label: "Missing resume date", path: "temp_away_pause_resume.missing_resume_date", expect: "≈ 0" },
    ],
  },
];

export function flowBySlug(slug: string): Flow | undefined {
  return FLOWS.find((f) => f.slug === slug);
}
