// lib/tags.ts
// The full tag vocabulary of both systems, grouped the way the ops team
// thinks about it. Rendered by the interactive TagGlossary on each
// dashboard. Meanings are sourced from the n8n workflow exports and the
// documented stage semantics, not guessed.

export interface TagDef {
  tag: string;
  meaning: string;
  writtenBy?: string;
}
export interface TagGroup {
  group: string;
  blurb: string;
  tags: TagDef[];
}

export const GYM_OWNER_TAG_GROUPS: TagGroup[] = [
  {
    group: "Lead identity",
    blurb: "Who the gym is and how it entered the system.",
    tags: [
      { tag: "prospect / new-lead", meaning: "Fresh, un-worked gym entering the pipeline.", writtenBy: "Lead Gen Pipeline" },
      { tag: "cf / crossfit", meaning: "CrossFit-sourced gym. Routes reporting and sequences on the CF side.", writtenBy: "Lead Gen Pipeline" },
      { tag: "hyrox", meaning: "HYROX-sourced gym.", writtenBy: "Lead Gen Pipeline" },
      { tag: "independent", meaning: "Independent gym, no franchise affiliation. Scores higher as a prospect.", writtenBy: "Lead Gen Pipeline" },
      { tag: "f45-franchise / orangetheory-franchise / shred415-franchise", meaning: "Franchise affiliation detected during enrichment. Used for the franchise vs independent comparison.", writtenBy: "Lead Gen Pipeline" },
      { tag: "hot / warm", meaning: "Prospect score band: hot is 65 plus, warm is 20 to 64. Cold gyms are skipped before entering GHL.", writtenBy: "Lead Gen Pipeline" },
    ],
  },
  {
    group: "Email sequence state",
    blurb: "Where the contact sits inside the 5-touch cold email sequence. The outreach stage a contact is in maps 1:1 to its touch step.",
    tags: [
      { tag: "draft-ready", meaning: "A Gmail draft exists and is waiting on David. Hand-off point to Dave Approval.", writtenBy: "Lead Gen Pipeline" },
      { tag: "outreach-sent", meaning: "A real first email left David's account. Everything downstream keys off this.", writtenBy: "Dave Approval Handler" },
      { tag: "touch-1 ... touch-5", meaning: "Exactly which touch the contact is on. Outreach step 5 with status complete means all 5 touches done and waiting on Instagram outreach; step 5 active means currently in touch 5.", writtenBy: "Dave Approval Handler" },
      { tag: "touch-N-pending / followup-draft-ready", meaning: "The next touch is drafted in Gmail but not yet sent.", writtenBy: "Cold Outreach Sequencer" },
      { tag: "sequence-complete / no-response", meaning: "All 5 touches sent with no reply. Contact moves toward the Instagram channel.", writtenBy: "Cold Outreach Sequencer" },
      { tag: "sequence-stopped", meaning: "The sequence was halted, by a reply, an unsubscribe, or a pause.", writtenBy: "Reply Detector and handlers" },
    ],
  },
  {
    group: "Reply outcomes",
    blurb: "What came back. A contact in the Responded stage replied at whatever touch its outreach step shows; Dead stage means unsubscribed at that touch.",
    tags: [
      { tag: "replied / replied-at-touch-N", meaning: "A real reply arrived, recorded against the exact touch that earned it.", writtenBy: "Reply Detector" },
      { tag: "interested", meaning: "Claude classified the reply as positive interest. Opportunity moves to Responded.", writtenBy: "Reply Detector" },
      { tag: "unsubscribed", meaning: "Not interested or asked to stop. Opportunity moves to Dead Lead.", writtenBy: "Reply Detector" },
      { tag: "auto-responder-detected", meaning: "An auto-responder redirected us to another address. Feeds the Alt Email pipeline.", writtenBy: "Reply Detector" },
      { tag: "auto-ack-detected", meaning: "Automatic acknowledgement only. Does not stop the sequence.", writtenBy: "Reply Detector" },
    ],
  },
  {
    group: "Instagram channel",
    blurb: "The IG follow-on for gyms that never replied to email. Handled by Mari.",
    tags: [
      { tag: "phone-ig-followup", meaning: "Email sequence exhausted; queued for the IG and phone channel.", writtenBy: "Cold Outreach Sequencer" },
      { tag: "ig-outreach-ready", meaning: "IG handle found and qualified. Needs to be contacted via IG.", writtenBy: "IG and Phone Outreach" },
      { tag: "ig-outreach-sent", meaning: "Mari has DM'd this gym on Instagram.", writtenBy: "IG Duplicate / manual" },
      { tag: "ig-direct / ig-generic", meaning: "Quality of the found handle: gym-specific vs generic or brand HQ.", writtenBy: "IG and Phone Outreach" },
      { tag: "ig-needs-review", meaning: "Scraping could not find a usable IG handle; needs manual scraping.", writtenBy: "IG and Phone Outreach" },
      { tag: "ig-replied-positive / ig-replied-negative", meaning: "Outcome of the DM, applied manually and routed by the IG Tag Handler.", writtenBy: "IG Tag Handler" },
      { tag: "ig-email-captured", meaning: "The gym replied on IG with a redirect email address. Feeds the IG Bridge.", writtenBy: "IG Duplicate / IG Tag Handler" },
      { tag: "ig-duplicate-matched / ig-review-noted", meaning: "Bookkeeping for GHL's auto-created IG contacts: matched to the master record, or flagged for review.", writtenBy: "IG Duplicate" },
      { tag: "source-instagram", meaning: "Marks that the redirect email came from IG rather than an email auto-responder. Compare with source-email on the alt pipeline.", writtenBy: "IG Tag Handler" },
    ],
  },
  {
    group: "IG Bridge sequence",
    blurb: "3-touch email bridge for gyms that redirected us from IG DM to email.",
    tags: [
      { tag: "ig-alt-outreach-sent", meaning: "Bridge touch 1 confirmed sent.", writtenBy: "IG Bridge Sequence" },
      { tag: "ig-bridge-sequence-complete", meaning: "Bridge finished, by final touch or by reply.", writtenBy: "IG Bridge Sequence" },
      { tag: "ig-bridge-replied-interested / ig-bridge-replied-not-interested", meaning: "Classified bridge reply. Moves to Responded or Dead Lead.", writtenBy: "IG Bridge Sequence" },
    ],
  },
  {
    group: "Alt email pipeline",
    blurb: "Outreach to the alternate address an auto-responder pointed us to.",
    tags: [
      { tag: "altmail-sent", meaning: "Alt outreach touch confirmed sent to the redirect address.", writtenBy: "Alt Email Outreaching" },
      { tag: "altmail-replied / altmail-interested / altmail-not-interested", meaning: "Reply state on the alt thread, classified the same way as the main sequence.", writtenBy: "Alt Email Outreaching" },
    ],
  },
  {
    group: "Phone follow-up",
    blurb: "Phone calls due roughly 10 days after an IG DM with no response.",
    tags: [
      { tag: "phone-followup-due", meaning: "Needs to be contacted via phone.", writtenBy: "IG and Phone Outreach" },
      { tag: "phone-called", meaning: "Call made, outcome not yet recorded.", writtenBy: "manual" },
      { tag: "phone-positive / phone-negative", meaning: "Call outcome. Routed to Responded or Dead Lead by the tag handler.", writtenBy: "IG Tag Handler" },
      { tag: "phone-resolved", meaning: "The phone loop is closed for this contact.", writtenBy: "IG Tag Handler" },
    ],
  },
  {
    group: "Pause and resume",
    blurb: "Out-of-office and temporary-away handling across all four channels.",
    tags: [
      { tag: "temporarily-paused", meaning: "Contact said try later. Sequence is on hold.", writtenBy: "Reply Detector / IG Tag Handler" },
      { tag: "paused-until-YYYY-MM-DD", meaning: "The exact resume date.", writtenBy: "Reply Detector / IG Tag Handler" },
      { tag: "paused-source-coldoutreach / altmail / igbridge / igmain", meaning: "Which channel paused them, so resume re-engages on the right one.", writtenBy: "pause writers" },
      { tag: "re-engaged", meaning: "Resume date passed and the system re-engaged them.", writtenBy: "Temp Away and Paused Contacts" },
      { tag: "resume-sequence-exhausted", meaning: "Came back from pause but the sequence had no touches left.", writtenBy: "Temp Away and Paused Contacts" },
    ],
  },
];

export const MEMBER_TAG_GROUPS: TagGroup[] = [
  {
    group: "GHL tags",
    blurb: "The member outreach system tracks state primarily in MongoDB; GHL tags mark identity.",
    tags: [
      { tag: "zp-member", meaning: "Existing Blended Athletics member found in Zen Planner.", writtenBy: "App Adoption Weekly Outreach" },
      { tag: "app-adoption-outreach", meaning: "This contact is part of the app adoption program.", writtenBy: "App Adoption Weekly Outreach" },
      { tag: "outreach-draft-ready", meaning: "Invite draft created in Gmail, awaiting send.", writtenBy: "App Adoption Weekly Outreach" },
      { tag: "followup-draft-ready", meaning: "Follow-up draft created, awaiting send.", writtenBy: "App Adoption Followup" },
    ],
  },
  {
    group: "MongoDB statuses (outreach_tracker_clean)",
    blurb: "The source of truth for each member's journey. One row per member, deduped by Zen Planner person id.",
    tags: [
      { tag: "draft_created", meaning: "Invite drafted in Gmail, not yet confirmed sent." },
      { tag: "outreach_sent_confirmed", meaning: "Invite confirmed sent from Gmail." },
      { tag: "followup_created", meaning: "Follow-up drafted, not yet confirmed sent." },
      { tag: "followup_sent_confirmed", meaning: "Follow-up confirmed sent." },
      { tag: "no_response", meaning: "4 to 5 plus days after follow-up with no reply. Set by the Monday cleanup." },
      { tag: "replied_other", meaning: "Replied with something that needs Dave's review." },
      { tag: "organic", meaning: "Was already on the app before any outreach. Counted in the community, not as a conversion." },
      { tag: "adopted", meaning: "Joined the app. If status is organic they joined on their own; otherwise outreach converted them." },
      { tag: "opted_out", meaning: "Asked not to be contacted." },
      { tag: "not_joining", meaning: "Explicitly confirmed they will not join." },
      { tag: "No email / Duplicate", meaning: "Skipped before outreach: no usable email, or already tracked." },
    ],
  },
];
