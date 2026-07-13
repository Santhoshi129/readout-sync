// Readout sync, n8n-free. Runs on GitHub Actions every 10 minutes (or on
// demand). Fetches GHL (paged, streaming), Google Sheets (service account),
// and MongoDB directly, computes the same Readout payloads the dashboard
// already understands, and upserts them into readout_cache_v2. The dashboard
// reads those documents straight from Mongo. n8n is not involved anywhere.
//
// Required env: MONGODB_URI, GOOGLE_SA_EMAIL, GOOGLE_SA_KEY
// Optional env (fall back to the known live values): GHL_LG_TOKEN, GHL_AA_TOKEN
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

// ---------- config ----------
const LG_TOKEN = process.env.GHL_LG_TOKEN || "Bearer pit-80260df3-f7ad-46af-b7ac-77e1d40f0432";
const AA_TOKEN = process.env.GHL_AA_TOKEN || "Bearer pit-f2f21773-20bb-44c1-8863-adc5e08028b3";
const LG_LOC = "XaKN6Kl5NGnFbEbYvtWO";
const LG_PIPE = "qXhbXi9cFGLjBOZCCrFF";
const AA_LOC = "646aL3Tdx3yojWyrcGza";
const AA_PIPE = "zAT94WRonEeLSXYzLWdZ";
const GHL_VER = "2021-07-28";
const STEP_FIELD = "pfpt1pOQ9chbAN67daK2";
const BRIDGE_FIELD = "5Tdp1iTiQZGFt8HielHE";
const LG_ST = {
  responded: "2e528889-3c9d-4f15-bfdc-97b5b35b3013",
  dead: "7833c005-23e2-4c6c-a827-ce2ca2870061",
  noresp: "36ef57e5-5c6c-4026-a1a5-57fa8b3cd3e2",
  newlead: "11e10ce3-bb1a-4a7d-9313-e7466902132b",
  ig: "0997bd50-c9d7-48cb-a319-61dc7e705fe4",
  alt: "a9a4e791-d3bc-46d8-b710-4c439fbd5245",
};
const AA_ST = {
  drafted: "29298999-a174-489e-be56-49340ede8040",
  sent: "86d13905-9480-4168-80a4-520fa54abdf4",
  followup: "06ec9a60-a8c7-4c12-a8a0-56a7b184651e",
  noresp: "12e51aad-b42e-4046-a445-dd9b336b4746",
  adopted: "5f64dab7-126c-497d-bc5f-6fe6f946ba0a",
  notjoin: "f6b84950-dac5-47c6-bd2e-1c8e659bb025",
  optout: "594a1fe1-0738-4ca8-a656-8d8958bbf939",
  replied: "ff7f7505-0055-4241-8fa1-b905132bfd94",
};
const SHEET_A = "1ozrlUj-3ZkZYolM6O8u-DQ0CkwB6So0no8s3duN50wQ"; // CF/HY leads + failed logs
const SHEET_B = "1UIX_BmHbRBnCDrdqwxPEKebmvx6FSciQ27vcO9EVzhw"; // AA no-email + duplicates

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ghlGet(token, url, qs) {
  const u = new URL(url);
  Object.entries(qs || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, { headers: { Authorization: token, Version: GHL_VER } });
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(1000); }
  }
  return null;
}

const countStage = async (token, loc, pipe, sid) => {
  const r = await ghlGet(token, "https://services.leadconnectorhq.com/opportunities/search", {
    location_id: loc, pipeline_id: pipe, pipeline_stage_id: sid, limit: 1,
  });
  return r?.meta?.total || 0;
};

// Google Sheets read-only via service account JWT (no external deps).
function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sheetsAccessToken() {
  const email = process.env.GOOGLE_SA_EMAIL;
  let key = process.env.GOOGLE_SA_KEY || "";
  key = key.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("GOOGLE_SA_EMAIL / GOOGLE_SA_KEY not set");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(key));
  const jwt = `${header}.${claim}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Sheets auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}
async function sheetRows(token, spreadsheetId, tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { console.warn(`Sheet read failed: ${tabName} (${res.status})`); return []; }
  const j = await res.json();
  const values = j.values || [];
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h ?? ""));
  return values.slice(1).map((row) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i] ?? ""; });
    return o;
  });
}
const getField = (row, cands) => {
  for (const k of Object.keys(row || {})) {
    if (cands.includes(k.trim().toLowerCase())) return (row[k] || "").toString().trim();
  }
  return "";
};

// Geo normalization (same rules as before).
const REGION = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC","AB","BC","MB","NB","NL","NS","ON","PE","QC","SK","NT","NU","YT"]);
const titleCase = (s) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
function geoLabel(rawCity, rawState) {
  let city = (rawCity || "").trim();
  let state = (rawState || "").trim().toUpperCase();
  if (!state) {
    const m = city.match(/^(.*),\s*([A-Za-z]{2})$/);
    if (m && REGION.has(m[2].toUpperCase())) { city = m[1].trim(); state = m[2].toUpperCase(); }
  }
  if (state) {
    const m = city.match(/^(.*),\s*([A-Za-z]{2})$/);
    if (m && m[2].toUpperCase() === state) city = m[1].trim();
  }
  city = titleCase(city);
  if (!city) return "";
  return state ? `${city}, ${state}` : city;
}

// ---------- lead gen (TWU) ----------
async function buildLeadGen(db, gToken) {
  const stResponded = await countStage(LG_TOKEN, LG_LOC, LG_PIPE, LG_ST.responded);
  const stDead = await countStage(LG_TOKEN, LG_LOC, LG_PIPE, LG_ST.dead);
  const stNoResp = await countStage(LG_TOKEN, LG_LOC, LG_PIPE, LG_ST.noresp);
  const stNewLead = await countStage(LG_TOKEN, LG_LOC, LG_PIPE, LG_ST.newlead);
  const stIG = await countStage(LG_TOKEN, LG_LOC, LG_PIPE, LG_ST.ig);
  const stAlt = await countStage(LG_TOKEN, LG_LOC, LG_PIPE, LG_ST.alt);

  // Opportunity stage map (small: two strings per opp).
  const stageOf = {};
  for (let page = 1; ; page++) {
    const r = await ghlGet(LG_TOKEN, "https://services.leadconnectorhq.com/opportunities/search", {
      location_id: LG_LOC, pipeline_id: LG_PIPE, limit: 100, page,
    });
    const b = r?.opportunities || [];
    for (const o of b) if (o.contactId) stageOf[o.contactId] = o.pipelineStageId;
    if (b.length < 100) break;
    await sleep(120);
  }

  // Stream contacts.
  const c = {};
  const inc = (k) => { c[k] = (c[k] || 0) + 1; };
  const n = (k) => c[k] || 0;
  const repliedMini = [], stuckDraftIds = [], mismatchIds = [], stuckPastResumeIds = [], missingResumeIds = [], legacyIgIds = [];
  const PAUSE_TAG = /^paused-until-(\d{4}-\d{2}-\d{2})$/;
  const SOURCES = ["coldoutreach", "altmail", "igbridge", "igmain"];
  const pausedBy = {}, reBy = {}, exBy = {};
  [...SOURCES, "unknown"].forEach((s) => { pausedBy[s] = 0; reBy[s] = 0; exBy[s] = 0; });
  let total = 0;
  const nowD = new Date();

  for (let page = 1; ; page++) {
    const r = await ghlGet(LG_TOKEN, "https://services.leadconnectorhq.com/contacts/", { locationId: LG_LOC, limit: 100, page });
    const batch = r?.contacts || [];
    for (const ct of batch) {
      total++;
      const t = ct.tags || [];
      const has = (x) => t.includes(x);
      const sf = (ct.customFields || []).find((f) => f.id === STEP_FIELD);
      const step = parseInt(sf?.value || "0") || 0;
      if (has("cf")) inc("cf");
      if (has("hyrox")) inc("hy");
      if (has("hot")) inc("hot");
      if (has("warm")) inc("warm");
      if (has("outreach-sent")) inc("sent");
      if (has("sequence-complete")) inc("seqdone");
      if (has("ig-outreach-ready")) inc("igReady");
      if (has("ig-outreach-sent")) inc("igSent");
      if (has("ig-replied-positive")) inc("igPos");
      if (has("ig-replied-negative")) inc("igNeg");
      if (has("phone-followup-due")) inc("phoneDue");
      if (has("phone-positive")) inc("phonePos");
      if (has("phone-negative")) inc("phoneNeg");
      if (has("phone-called") && !has("phone-positive") && !has("phone-negative")) inc("phoneCalledOnly");
      if (has("phone-resolved")) inc("phoneResolved");
      if (has("phone-followup-due") && !has("phone-resolved")) inc("phoneStillDue");
      if (step >= 1) { inc("inSeq"); if (step <= 5) inc(`t${step}`); }
      if (has("replied")) {
        inc("replied");
        repliedMini.push({
          name: ct.contactName || ct.name || `${ct.firstName || ""} ${ct.lastName || ""}`.trim() || "Unknown",
          time: ct.dateUpdated || ct.updatedAt || "",
          channel: has("ig-outreach-sent") ? "ig" : "email",
        });
      }
      if (has("interested")) inc("interested");
      if (has("unsubscribed")) inc("unsub");
      if (has("auto-responder-detected")) inc("autoresp");
      if (has("auto-ack-detected")) inc("autoack");
      if (has("replied") && !has("interested") && !has("unsubscribed") && !has("auto-responder-detected")) inc("otherReply");
      if (has("altmail-sent")) inc("altSent");
      if (has("altmail-replied")) inc("altReplied");
      if (has("altmail-interested")) inc("altInt");
      if (has("altmail-not-interested")) inc("altNot");
      if (has("ig-alt-outreach-sent")) inc("igAltSent");
      if (has("ig-bridge-sequence-complete")) inc("igbDone");
      if (has("ig-bridge-replied-interested")) inc("igbInt");
      if (has("ig-bridge-replied-not-interested")) inc("igbNot");
      if (has("ig-bridge-auto-ack-detected")) inc("igbAck");
      if (has("ig-bridge-reply-needs-review")) inc("igbRev");
      if (has("temporarily-paused") && has("paused-source-igbridge")) inc("igbPaused");
      const bf = (ct.customFields || []).find((f) => f.id === BRIDGE_FIELD);
      if (bf && /drafted, pending send/i.test(String(bf.value || ""))) inc("igbStuck");
      if (has("ig-review-noted")) inc("igUnmatched");
      const hasProgressed = has("outreach-sent") || t.some((x) => /^touch-[2-5]$/.test(x));
      if (hasProgressed && (has("draft-ready") || has("followup-draft-ready"))) stuckDraftIds.push(ct.id);
      if (step !== 0) {
        const stg = stageOf[ct.id];
        if (stg !== LG_ST.responded && stg !== LG_ST.dead && !has("replied") && !has("unsubscribed") && !has(`touch-${step}`)) mismatchIds.push(ct.id);
      }
      if (has("temporarily-paused")) {
        inc("paused");
        const src = SOURCES.find((s) => has(`paused-source-${s}`));
        pausedBy[src || "unknown"]++;
        const ptag = t.find((x) => PAUSE_TAG.test(x));
        if (!ptag) missingResumeIds.push(ct.id);
        else {
          const d = new Date(`${ptag.match(PAUSE_TAG)[1]}T09:00:00Z`);
          if (!isNaN(d.getTime()) && d < nowD) stuckPastResumeIds.push(ct.id);
        }
      }
      if (has("re-engaged")) { inc("reEng"); const src = SOURCES.find((s) => has(`paused-source-${s}`)); reBy[src || "unknown"]++; }
      if (has("resume-sequence-exhausted")) { inc("resEx"); const src = SOURCES.find((s) => has(`paused-source-${s}`)); exBy[src || "unknown"]++; }
      if (has("ig-bridge-temp-paused") && !has("temporarily-paused")) legacyIgIds.push(ct.id);
    }
    if (batch.length < 100) break;
    await sleep(120);
  }
  console.log(`LeadGen: streamed ${total} contacts`);

  // Sheets, one tab at a time.
  let cfDrafts = 0, hyDrafts = 0;
  const geoMap = {};
  {
    const rows = await sheetRows(gToken, SHEET_A, "Crossfit - Clean Leads");
    cfDrafts = rows.length;
    for (const r of rows) { const l = geoLabel(getField(r, ["city"]), getField(r, ["state", "province"])); if (l) geoMap[l] = (geoMap[l] || 0) + 1; }
  }
  {
    const rows = await sheetRows(gToken, SHEET_A, "Hyrox - Clean Leads");
    hyDrafts = rows.length;
    for (const r of rows) { const l = geoLabel(getField(r, ["city"]), getField(r, ["state", "province"])); if (l) geoMap[l] = (geoMap[l] || 0) + 1; }
  }
  const geoDistribution = Object.entries(geoMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

  let hyScraped = 0, hyProcessed = 0;
  {
    const rows = await sheetRows(gToken, SHEET_A, "Hyrox - Raw Leads");
    hyScraped = rows.length;
    hyProcessed = rows.filter((r) => (r["Fetched"] || "").toString().toLowerCase() === "yes").length;
  }
  const hyPending = hyScraped - hyProcessed;

  let cfFailed = 0, hyFailed = 0, cfDup = 0, hyDup = 0, cfNoEmail = 0, hyNoEmail = 0;
  {
    const rows = await sheetRows(gToken, SHEET_A, "Failed Logs");
    for (const r of rows) {
      const s = getField(r, ["source"]).toLowerCase();
      const fs = getField(r, ["failure stage"]).toLowerCase();
      const er = getField(r, ["error"]).toLowerCase();
      const isCf = s === "crossfit" || s === "cf";
      const isHy = s === "hyrox";
      if (isCf) { cfFailed++; if (fs === "duplicate_skipped") cfDup++; if (er.includes("no email found")) cfNoEmail++; }
      if (isHy) { hyFailed++; if (fs === "duplicate_skipped") hyDup++; if (er.includes("no email found")) hyNoEmail++; }
    }
  }

  // Mongo sources, direct.
  const cfRawDocs = await db.collection("cf_gym_details").find({}, { projection: { processed: 1 } }).toArray();
  const cfScraped = cfRawDocs.length;
  const cfProcessed = cfRawDocs.filter((r) => r.processed === true).length;
  const cfPending = cfScraped - cfProcessed;
  const oldCache = (await db.collection("readout_cache").findOne({ _id: "twu_readout_v1" })) || {};
  const cachedEnr = oldCache.lead_sources_enriched || {};

  // Derived + payload.
  const totalPipeline = stResponded + stDead + stNoResp + stNewLead + stIG;
  const replyRate = totalPipeline > 0 ? parseFloat(((stResponded / totalPipeline) * 100).toFixed(1)) : 0;
  const repliedContacts = repliedMini.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 4);
  const totalRepliesClassified = n("interested") + n("unsub") + n("autoresp") + n("autoack") + n("otherReply");
  const altNoReplyYet = n("altSent") - n("altReplied");
  const altCoverage = n("autoresp") > 0 ? parseFloat(((n("altSent") / n("autoresp")) * 100).toFixed(1)) : 0;
  const igbReplyRate = n("igAltSent") > 0 ? parseFloat((((n("igbInt") + n("igbNot") + n("igbRev")) / n("igAltSent")) * 100).toFixed(1)) : 0;
  const combinedScraped = cfScraped + hyScraped, combinedProcessed = cfProcessed + hyProcessed, combinedPending = cfPending + hyPending;
  const combinedFailed = cfFailed + hyFailed, combinedDup = cfDup + hyDup, combinedNoEmail = cfNoEmail + hyNoEmail;
  const combinedDrafts = cfDrafts + hyDrafts;
  const now = new Date().toISOString();

  return {
    meta: { dashboard: "TWU · The Readout", generated_at: now, version: "v4-gha", served_from: "mongo-cache" },
    lead_gen: {
      total_contacts_in_ghl: total, crossfit_contacts_in_ghl: n("cf"), hyrox_contacts_in_ghl: n("hy"),
      hot_leads: n("hot"), warm_leads: n("warm"), email_outreach_sent: n("sent"), email_replied: n("replied"),
      sequence_complete: n("seqdone"),
      touch_sequence: { in_sequence: n("inSeq"), step_1: n("t1"), step_2: n("t2"), step_3: n("t3"), step_4: n("t4"), step_5: n("t5") },
      ig_outreach_ready: n("igReady"), ig_outreach_sent: n("igSent"), ig_replied_positive: n("igPos"), ig_replied_negative: n("igNeg"),
      replied_contacts: repliedContacts, phone_followup_due: n("phoneDue"), phone_still_due: n("phoneStillDue"),
      phone_positive: n("phonePos"), phone_negative: n("phoneNeg"), phone_called_only: n("phoneCalledOnly"), phone_resolved: n("phoneResolved"),
      stage_new_lead: stNewLead, stage_responded: stResponded, stage_dead: stDead, stage_no_response: stNoResp, stage_ig_outreach: stIG,
      total_in_pipeline: totalPipeline, email_reply_rate_pct: replyRate,
    },
    lead_sources_raw: { cf_scraped: cfScraped, cf_processed: cfProcessed, cf_pending: cfPending, hy_scraped: hyScraped, hy_processed: hyProcessed, hy_pending: hyPending, combined_scraped: combinedScraped, combined_processed: combinedProcessed, combined_pending: combinedPending },
    lead_sources_failed: { cf_failed: cfFailed, hy_failed: hyFailed, total_failed: combinedFailed, cf_no_email: cfNoEmail, hy_no_email: hyNoEmail, total_no_email: combinedNoEmail, cf_duplicates_skipped: cfDup, hy_duplicates_skipped: hyDup, total_duplicates_skipped: combinedDup },
    lead_sources_drafts: { cf_drafts_created: cfDrafts, hy_drafts_created: hyDrafts, total_drafts_created: combinedDrafts },
    lead_sources_enriched: {
      cf_in_ghl: n("cf"), cf_duplicate_skipped: cfDup, cf_enrichment_failed: cachedEnr.cf_enrichment_failed || 0,
      cf_hot: cachedEnr.cf_hot || 0, cf_warm: cachedEnr.cf_warm || 0, cf_direct_email: cachedEnr.cf_direct_email || 0,
      cf_generic_email: cachedEnr.cf_generic_email || 0, cf_avg_prospect_score: cachedEnr.cf_avg_prospect_score || 0,
      hy_in_ghl: n("hy"), hy_duplicate_skipped: hyDup, hy_enrichment_failed: cachedEnr.hy_enrichment_failed || 0,
      hy_hot: cachedEnr.hy_hot || 0, hy_warm: cachedEnr.hy_warm || 0, hy_direct_email: cachedEnr.hy_direct_email || 0,
      hy_generic_email: cachedEnr.hy_generic_email || 0, hy_avg_prospect_score: cachedEnr.hy_avg_prospect_score || 0,
      combined_in_ghl: n("cf") + n("hy"), combined_hot: (cachedEnr.cf_hot || 0) + (cachedEnr.hy_hot || 0),
      combined_warm: (cachedEnr.cf_warm || 0) + (cachedEnr.hy_warm || 0),
      cf_failed: cfFailed, hy_failed: hyFailed, total_failed: combinedFailed,
    },
    geo_distribution: geoDistribution,
    data_integrity: {
      stuck_draft_tags: stuckDraftIds.length, step_tag_mismatch: mismatchIds.length, ig_unmatched_duplicates: n("igUnmatched"),
      ig_bridge_stuck_pending: n("igbStuck"), stuck_past_resume_date: stuckPastResumeIds.length, missing_resume_date: missingResumeIds.length,
      legacy_ig_bridge_stuck_tag: legacyIgIds.length, stuck_draft_tag_ids: stuckDraftIds, step_tag_mismatch_ids: mismatchIds,
      stuck_past_resume_date_ids: stuckPastResumeIds, missing_resume_date_ids: missingResumeIds, legacy_ig_bridge_stuck_ids: legacyIgIds,
    },
    reply_breakdown: { interested: n("interested"), not_interested: n("unsub"), auto_responder: n("autoresp"), auto_ack: n("autoack"), other: n("otherReply"), total_classified: totalRepliesClassified },
    alt_email_outreach: { auto_responders_detected: n("autoresp"), alt_outreach_started: n("altSent"), alt_outreach_coverage_pct: altCoverage, in_alt_outreaching_stage: stAlt, awaiting_reply: altNoReplyYet, replied: n("altReplied"), interested: n("altInt"), not_interested: n("altNot") },
    ig_bridge_outreach: { touch1_sent: n("igAltSent"), sequence_complete: n("igbDone"), replied_interested: n("igbInt"), replied_not_interested: n("igbNot"), auto_ack: n("igbAck"), needs_review: n("igbRev"), temp_paused: n("igbPaused"), temp_paused_legacy_tag: legacyIgIds.length, reply_rate_pct: igbReplyRate },
    temp_away_pause_resume: { total_paused: n("paused"), paused_by_source: pausedBy, total_resumed: n("reEng"), resumed_by_source: reBy, resume_sequence_exhausted: n("resEx"), resume_exhausted_by_source: exBy, stuck_past_resume_date: stuckPastResumeIds.length, missing_resume_date: missingResumeIds.length, legacy_ig_bridge_stuck_tag: legacyIgIds.length },
    summary: {
      total_gyms_scraped: combinedScraped, cf_scraped: cfScraped, hy_scraped: hyScraped, total_contacts_ghl: total,
      cf_contacts_ghl: n("cf"), hy_contacts_ghl: n("hy"), total_failed: combinedFailed, cf_failed: cfFailed, hy_failed: hyFailed,
      total_no_email: combinedNoEmail, cf_no_email: cfNoEmail, hy_no_email: hyNoEmail, total_duplicates_skipped: combinedDup,
      cf_duplicates_skipped: cfDup, hy_duplicates_skipped: hyDup, total_drafts_created: combinedDrafts,
      cf_drafts_created: cfDrafts, hy_drafts_created: hyDrafts, touch_1_tagged: n("t1"), replied_lead_gen: n("replied"),
      ig_dms_sent: n("igSent"), ig_ready_to_send: n("igReady"), phone_calls_due: n("phoneDue"), phone_still_due: n("phoneStillDue"),
      phone_positive: n("phonePos"), phone_negative: n("phoneNeg"), phone_called_only: n("phoneCalledOnly"),
      ig_unmatched_duplicates: n("igUnmatched"), stuck_draft_tags: stuckDraftIds.length, step_tag_mismatch: mismatchIds.length,
      replies_interested: n("interested"), replies_not_interested: n("unsub"), replies_auto_responder: n("autoresp"),
      replies_auto_ack: n("autoack"), replies_other: n("otherReply"), alt_outreach_started: n("altSent"),
      alt_outreach_coverage_pct: altCoverage, alt_outreach_replied: n("altReplied"), alt_outreach_interested: n("altInt"),
      ig_bridge_sent: n("igAltSent"), ig_bridge_replied: n("igbInt") + n("igbNot"), ig_bridge_stuck_pending: n("igbStuck"),
      temp_away_total_paused: n("paused"), temp_away_total_resumed: n("reEng"), temp_away_stuck_past_resume: stuckPastResumeIds.length,
      temp_away_missing_date: missingResumeIds.length, temp_away_resume_exhausted: n("resEx"), legacy_ig_bridge_stuck_tag: legacyIgIds.length,
    },
  };
}

// ---------- app adoption (Blended) ----------
async function buildAppAdoption(db, gToken) {
  const stDrafted = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.drafted);
  const stSent = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.sent);
  const stFollowup = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.followup);
  const stNoResp = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.noresp);
  const stAdopted = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.adopted);
  const stNotJoin = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.notjoin);
  const stOptOut = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.optout);
  const stReplied = await countStage(AA_TOKEN, AA_LOC, AA_PIPE, AA_ST.replied);

  const toBool = (v) => v === true || v === "TRUE" || v === "true";
  const rowsIn = await db.collection("outreach_tracker_clean").find({}, {
    projection: { zp_person_id: 1, created_at: 1, status: 1, adopted: 1, opted_out: 1, outreach_sent_confirmed_date: 1, followup_sent_confirmed_date: 1 },
  }).toArray();
  const seen = {};
  for (const r of rowsIn) {
    const id = r.zp_person_id;
    if (!id) continue;
    if (!seen[id]) { seen[id] = r; continue; }
    const a = new Date(seen[id].created_at || 0).getTime();
    const b = new Date(r.created_at || 0).getTime();
    if (b > a) seen[id] = r;
  }
  let aaTotal = 0, aaDraft = 0, aaFupDraft = 0, aaOutConf = 0, aaFupConf = 0, aaAdopted = 0, aaOrganic = 0, aaOptedOut = 0, aaNoResp = 0, aaNeedsReview = 0, aaNoEmailMongo = 0, aaDupMongo = 0;
  for (const r of Object.values(seen)) {
    aaTotal++;
    if (r.status === "draft_created" && !r.outreach_sent_confirmed_date) aaDraft++;
    if (r.status === "followup_created" && !r.followup_sent_confirmed_date) aaFupDraft++;
    if (r.status === "outreach_sent_confirmed") aaOutConf++;
    if (r.status === "followup_sent_confirmed") aaFupConf++;
    if (toBool(r.adopted) && r.status !== "organic") aaAdopted++;
    if (r.status === "organic") aaOrganic++;
    if (toBool(r.opted_out)) aaOptedOut++;
    if (r.status === "no_response") aaNoResp++;
    if (r.status === "replied_other") aaNeedsReview++;
    if (r.status === "No email") aaNoEmailMongo++;
    if (r.status === "Duplicate") aaDupMongo++;
  }
  console.log(`AppAdoption: ${aaTotal} tracked members`);

  const notJoining = await db.collection("outreach_tracker_clean").countDocuments({ status: "not_joining" });

  let noEmailSheet = 0, dupSheet = 0;
  {
    const rows = await sheetRows(gToken, SHEET_B, "No Email");
    noEmailSheet = rows.filter((r) => {
      const zp = getField(r, ["zp_person_id"]);
      return zp.length > 0;
    }).length;
  }
  {
    const rows = await sheetRows(gToken, SHEET_B, "duplicates");
    dupSheet = rows.filter((r) => {
      const zp = getField(r, ["zp_person_id"]);
      return zp.length > 0;
    }).length;
  }

  const aaJoined = aaAdopted + aaOrganic;
  const adoptionRate = aaTotal > 0 ? parseFloat(((aaJoined / aaTotal) * 100).toFixed(1)) : 0;
  const now = new Date().toISOString();

  return {
    meta: { dashboard: "TWU · The Readout", generated_at: now, version: "v4-gha", served_from: "mongo-cache" },
    app_adoption: {
      total_identified: aaTotal, email_draft_in_gmail: aaDraft, followup_draft_in_gmail: aaFupDraft,
      email_outreach_confirmed: aaOutConf, followup_confirmed: aaFupConf, adopted: aaAdopted,
      already_on_app: aaOrganic, total_joined: aaJoined, opted_out: aaOptedOut, no_response: aaNoResp,
      needs_dave_review: aaNeedsReview, adoption_rate_pct: adoptionRate, no_email_mongo_count: aaNoEmailMongo,
      duplicate_mongo_count: aaDupMongo, no_email_sheet_count: noEmailSheet, duplicate_sheet_count: dupSheet,
      not_joining_confirmed: notJoining, stage_drafted: stDrafted, stage_sent: stSent, stage_followup: stFollowup,
      stage_no_response: stNoResp, stage_adopted: stAdopted, stage_not_joining: stNotJoin,
      stage_opted_out: stOptOut, stage_replied: stReplied,
    },
    summary: {
      total_email_drafts_in_gmail: aaDraft + aaFupDraft, replied_app_adoption: stReplied,
      app_adoption_no_email_mongo: aaNoEmailMongo, app_adoption_duplicate_mongo: aaDupMongo,
      app_adoption_not_joining_confirmed: notJoining,
    },
  };
}

// ---------- main ----------
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const gToken = await sheetsAccessToken();

  const lg = await buildLeadGen(db, gToken);
  await db.collection("readout_cache_v2").updateOne(
    { doc_id: "twu_readout_live" },
    { $set: { generated_at: lg.meta.generated_at, payload: lg } },
    { upsert: true },
  );
  console.log("Stored twu_readout_live");

  const aa = await buildAppAdoption(db, gToken);
  await db.collection("readout_cache_v2").updateOne(
    { doc_id: "blended_readout_live" },
    { $set: { generated_at: aa.meta.generated_at, payload: aa } },
    { upsert: true },
  );
  console.log("Stored blended_readout_live");

  // Append (never overwrite) a compact snapshot for trend charts. Only the
  // numeric fields worth plotting over time - not the full payload - to keep
  // documents small across months of 10-minute snapshots. Real data only:
  // whatever the two builders actually computed this run, nothing invented.
  const ts = new Date();
  await db.collection("readout_history").insertOne({
    ts,
    doc_id: "twu_readout_live",
    metrics: {
      total_contacts_in_ghl: lg.lead_gen?.total_contacts_in_ghl ?? 0,
      hot_leads: lg.lead_gen?.hot_leads ?? 0,
      warm_leads: lg.lead_gen?.warm_leads ?? 0,
      email_outreach_sent: lg.lead_gen?.email_outreach_sent ?? 0,
      email_replied: lg.lead_gen?.email_replied ?? 0,
      ig_outreach_sent: lg.lead_gen?.ig_outreach_sent ?? 0,
      ig_replied_positive: lg.lead_gen?.ig_replied_positive ?? 0,
      total_drafts_created: (lg.lead_sources_drafts?.cf_drafts_created ?? 0) + (lg.lead_sources_drafts?.hy_drafts_created ?? 0),
      total_in_pipeline: lg.lead_gen?.total_in_pipeline ?? 0,
      email_reply_rate_pct: lg.lead_gen?.email_reply_rate_pct ?? 0,
    },
  });
  await db.collection("readout_history").insertOne({
    ts,
    doc_id: "blended_readout_live",
    metrics: {
      total_identified: aa.app_adoption?.total_identified ?? 0,
      email_outreach_confirmed: aa.app_adoption?.email_outreach_confirmed ?? 0,
      adopted: aa.app_adoption?.adopted ?? 0,
      already_on_app: aa.app_adoption?.already_on_app ?? 0,
      total_joined: aa.app_adoption?.total_joined ?? 0,
      opted_out: aa.app_adoption?.opted_out ?? 0,
      adoption_rate_pct: aa.app_adoption?.adoption_rate_pct ?? 0,
    },
  });
  console.log("Stored history snapshots");

  await client.close();
  console.log("Sync complete");
}


main().catch((e) => { console.error(e); process.exit(1); });
