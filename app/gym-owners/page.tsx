import { getReadout, getHistory } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring, Compare, Donut, GeoList, Trend, ReplyBreakdown } from "@/components/Charts";
import { Counter } from "@/components/Counter";
import { GymOwnerBriefing } from "@/components/Briefing";
import { num, sum, section, Head, FlowCard } from "@/lib/dashboard-ui";
import { PipelineMap } from "@/components/PipelineMap";
import { fmt } from "@/lib/format";

export const revalidate = 30;

export default async function GymOwnersDashboard() {
  const { data, error, fetchedAt } = await getReadout();
  const history = await getHistory("twu_readout_live", 14);
  const flows = FLOWS.filter((f) => section(f.category) === "gym-owner").sort((a, b) => a.order - b.order);
  const launch = flows.reduce((min, f) => (f.goLive < min ? f.goLive : min), flows[0]?.goLive ?? fetchedAt);

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={data?.meta?.generated_at || fetchedAt} crossLinkHref="/members" crossLinkLabel="Member Adoption Pulse" />
      <div className="wrap">
        <div style={{ paddingTop: 28 }}>
          <a className="back" href="/">← All dashboards</a>
        </div>

        {error && (
          <div className="banner err" style={{ marginTop: 20 }}>
            The Readout is unreachable right now ({error}). Numbers below will fill in as soon as it responds.
          </div>
        )}

        <section style={{ padding: "28px 0 0" }}>
          <span className="chip" style={{ marginBottom: 14, display: "inline-flex" }}>Train With Us</span>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Owner Outreach Intelligence</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 680 }}>
            {flows.length} automations running the full gym-owner acquisition motion, from first contact through email, Instagram, and phone to a booked reply. Every figure below is computed live from GHL, Sheets, and MongoDB - nothing is entered by hand.
          </p>
          <GymOwnerBriefing data={data} launchIso={launch} />
        </section>

        <section className="section" style={{ borderTop: "none", paddingTop: 8 }}>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <Head label="Contacts in CRM" path="lead_gen.total_contacts_in_ghl" data={data} />
            <Head label="Emails sent" path="lead_gen.email_outreach_sent" data={data} />
            <Head label="Replied" path="lead_gen.email_replied" data={data} amber />
            <Head label="Reply rate" path="lead_gen.email_reply_rate_pct" data={data} suffix="%" />
          </div>

          <PipelineMap
            title="Lead journey - stage by stage"
            note="The live shape of the gym-owner pipeline in GHL. Hover a stage for what it means; a few stages carry extra detail below the description."
            stages={[
              { name: "New Lead Acquired", count: num(data, "lead_gen.stage_new_lead"), desc: "First email just went out. In the 5-touch sequence now.", tone: "cold" },
              {
                name: "Responded", count: num(data, "lead_gen.stage_responded"),
                desc: "A genuinely interested reply, from either the email sequence or Alt Outreaching. Nothing moves past this - it's the goal.",
                tone: "amber",
                extra: (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 10, fontFamily: "var(--mono)" }}>REPLIES BY TOUCH (ALL CHANNELS)</div>
                    <Bars
                      rows={[
                        { label: "Touch 1", value: num(data, "lead_gen.replied_at_touch.touch_1"), tone: "cold" },
                        { label: "Touch 2", value: num(data, "lead_gen.replied_at_touch.touch_2"), tone: "cold" },
                        { label: "Touch 3", value: num(data, "lead_gen.replied_at_touch.touch_3"), tone: "warm" },
                        { label: "Touch 4", value: num(data, "lead_gen.replied_at_touch.touch_4"), tone: "warm" },
                        { label: "Touch 5", value: num(data, "lead_gen.replied_at_touch.touch_5"), tone: "hot" },
                        { label: "Unattributed", value: num(data, "lead_gen.replied_at_touch.unattributed"), tone: "muted" },
                      ]}
                    />
                  </div>
                ),
              },
              { name: "No Response", count: num(data, "lead_gen.stage_no_response"), desc: "All 5 touches sent, no reply. Moves to Instagram next.", tone: "warm" },
              {
                name: "Instagram Outreach", count: num(data, "lead_gen.stage_ig_outreach"),
                desc: "DM sent. Positive, negative, and phone-due outcomes all stay parked at this same stage - only the tag changes.",
                tone: "hot",
                extra: (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 10, fontFamily: "var(--mono)" }}>OUTCOME TAGS (stage doesn&apos;t change, only tags do)</div>
                    <Bars
                      rows={[
                        { label: "Replied positive", value: num(data, "lead_gen.ig_replied_positive"), tone: "hot" },
                        { label: "Replied negative", value: num(data, "lead_gen.ig_replied_negative"), tone: "bad" },
                        { label: "No reply, phone due", value: num(data, "lead_gen.phone_followup_due"), tone: "muted" },
                      ]}
                    />
                    <div style={{ color: "var(--ink-faint)", fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                      &quot;Phone due&quot; only counts contacts past the 10-day no-reply mark - most DM&apos;d contacts haven&apos;t hit that yet.
                    </div>
                  </div>
                ),
              },
              {
                name: "Phone Follow-up", count: num(data, "lead_gen.phone_followup_due"),
                desc: "A tag, not a pipeline stage - fires when a DM got no reply past the follow-up window.",
                tone: "muted",
                extra: (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 10, fontFamily: "var(--mono)" }}>CALL OUTCOME TAGS</div>
                    <Bars
                      rows={[
                        { label: "Positive", value: num(data, "lead_gen.phone_positive"), tone: "hot" },
                        { label: "Negative", value: num(data, "lead_gen.phone_negative"), tone: "bad" },
                        { label: "Called, no outcome yet", value: num(data, "lead_gen.phone_called_only"), tone: "warm" },
                        { label: "Resolved", value: num(data, "lead_gen.phone_resolved"), tone: "cold" },
                      ]}
                    />
                  </div>
                ),
              },
              {
                name: "Alt Outreaching", count: num(data, "lead_gen.stage_alt_outreaching"),
                desc: "One stage, two doors in: an email auto-reply redirect, or a positive IG reply with a redirect email. Resolves to Responded, Dead, or paused.",
                tone: "cold",
                extra: (
                  <Bars
                    rows={[
                      { label: "Via email auto-responder", value: num(data, "alt_email_outreach.alt_outreach_started"), tone: "cold" },
                      { label: "Via IG Bridge", value: num(data, "ig_bridge_outreach.touch1_sent"), tone: "hot" },
                    ]}
                  />
                ),
              },
              { name: "Dead Lead", count: num(data, "lead_gen.stage_dead"), desc: "Unsubscribed or said no - reachable from New Lead, Instagram, or Alt Outreaching, not only the end of a finished sequence.", tone: "muted" },
            ]}
          />

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>14-day trend</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>Built from a snapshot taken every sync run (every 10 minutes). Real accumulated history, not interpolated.</div>
            <Trend
              points={history}
              series={[
                { key: "total_contacts_in_ghl", label: "Contacts in CRM", tone: "cold" },
                { key: "email_replied", label: "Email replies", tone: "amber" },
                { key: "total_drafts_created", label: "Drafts created", tone: "warm" },
              ]}
            />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Channel effectiveness</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>Reply rate per outbound channel - not volume, but how well each one actually converts what it sends.</div>
            {(() => {
              const emailSent = num(data, "lead_gen.email_outreach_sent") ?? 0;
              const emailReplied = num(data, "lead_gen.email_replied") ?? 0;
              const igSent = num(data, "lead_gen.ig_outreach_sent") ?? 0;
              const igReplied = sum(data, ["lead_gen.ig_replied_positive", "lead_gen.ig_replied_negative"]) ?? 0;
              const phoneResolved = num(data, "lead_gen.phone_resolved") ?? 0;
              const phonePositive = num(data, "lead_gen.phone_positive") ?? 0;
              const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
              const channels = [
                { label: "Email", value: rate(emailReplied, emailSent) },
                { label: "Instagram", value: rate(igReplied, igSent) },
                { label: "Phone", value: rate(phonePositive, phoneResolved) },
              ].filter((c) => c.value != null) as { label: string; value: number }[];
              const best = channels.length ? channels.reduce((a, b) => (b.value > a.value ? b : a)) : null;
              const worst = channels.length > 1 ? channels.reduce((a, b) => (b.value < a.value ? b : a)) : null;
              return (
                <>
                  {best && worst && best.label !== worst.label && (
                    <div className="compare-headline" style={{ marginBottom: 18 }}>
                      <span className="compare-headline-dot" style={{ background: "var(--hot)" }} />
                      {best.label} converts best at {best.value}% - {(best.value / Math.max(worst.value, 0.1)).toFixed(1)}x {worst.label}'s {worst.value}%.
                    </div>
                  )}
                  <Bars
                    rows={[
                      { label: `Email - ${fmt(emailReplied)}/${fmt(emailSent)} replied`, value: rate(emailReplied, emailSent), tone: "amber" },
                      { label: `Instagram - ${fmt(igReplied)}/${fmt(igSent)} replied`, value: rate(igReplied, igSent), tone: "hot" },
                      { label: `Phone - ${fmt(phonePositive)}/${fmt(phoneResolved)} positive`, value: rate(phonePositive, phoneResolved), tone: "warm" },
                    ]}
                  />
                </>
              );
            })()}
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Reply intelligence</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22, maxWidth: 680 }}>
              What came back on each channel - positive, negative, automated.
            </div>
            <div className="grid grid-3" style={{ gap: 20 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Email</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 14 }}>Via Reply Detector classifier</div>
                <ReplyBreakdown
                  positive={num(data, "reply_breakdown.interested")}
                  negative={num(data, "reply_breakdown.not_interested")}
                  automated={sum(data, ["reply_breakdown.auto_responder", "reply_breakdown.auto_ack", "reply_breakdown.other"])}
                  negativeLabel="Negative (unsubscribed)"
                  breakdown={[
                    { label: "Auto-responder (redirect)", value: num(data, "reply_breakdown.auto_responder"), tone: "warm" },
                    { label: "Auto-ack", value: num(data, "reply_breakdown.auto_ack"), tone: "amber" },
                    { label: "Other / uncategorized", value: num(data, "reply_breakdown.other"), tone: "muted" },
                  ]}
                />
                {(() => {
                  const classified = num(data, "reply_breakdown.total_classified") ?? 0;
                  const knownReplies = num(data, "lead_gen.email_replied") ?? 0;
                  return classified < knownReplies ? (
                    <div className="stat-flag" style={{ marginTop: 14, fontSize: 11.5 }}>
                      Classified ({classified}) trails raw replies ({knownReplies}) - classifier is behind upstream.
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Instagram - main channel</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 14 }}>Mari classifies every DM reply by hand - positive or negative, no automated bucket</div>
                <Donut
                  centerLabel="replied"
                  segments={[
                    { label: "Positive", value: num(data, "lead_gen.ig_replied_positive"), tone: "hot" },
                    { label: "Negative", value: num(data, "lead_gen.ig_replied_negative"), tone: "bad" },
                  ]}
                />
              </div>

              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Alternative email bridge</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 14 }}>A positive IG reply that also gave a redirect email</div>
                <ReplyBreakdown
                  positive={num(data, "ig_bridge_outreach.replied_interested")}
                  negative={num(data, "ig_bridge_outreach.replied_not_interested")}
                  automated={sum(data, ["ig_bridge_outreach.auto_ack", "ig_bridge_outreach.needs_review"])}
                  breakdown={[
                    { label: "Auto-ack", value: num(data, "ig_bridge_outreach.auto_ack"), tone: "amber" },
                    { label: "Needs review", value: num(data, "ig_bridge_outreach.needs_review"), tone: "muted" },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Instagram outreach progress</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>Where every IG-bound contact actually sits - separate from what they replied.</div>
            {(() => {
              const readyOnly = num(data, "lead_gen.ig_outreach_ready") ?? 0;
              const readyAndSent = num(data, "lead_gen.ig_outreach_ready_and_sent") ?? 0;
              const sentOnly = num(data, "lead_gen.ig_outreach_sent_only") ?? 0;
              const needsReview = num(data, "lead_gen.ig_needs_review") ?? 0;
              const dupMatched = num(data, "lead_gen.ig_duplicate_matched") ?? 0;
              const sentNoHandle = num(data, "lead_gen.ig_sent_no_handle") ?? 0;
              return (
                <>
                  <Bars
                    rows={[
                      { label: "Ready (backlog)", value: readyOnly, tone: "cold" },
                      { label: "Ready \u2192 sent", value: readyAndSent, tone: "amber" },
                      { label: "Sent, no ready tag", value: sentOnly, tone: "muted" },
                      { label: "Needs review", value: needsReview, tone: "bad" },
                      { label: "Duplicate-matched (fixed)", value: dupMatched, tone: "hot" },
                      { label: "Sent, no handle on file", value: sentNoHandle, tone: "warm" },
                    ]}
                  />
                  <div style={{ color: "var(--ink-faint)", fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
                    &quot;Needs review&quot; covers both a rejected generic/brand-HQ handle and no handle found at all - the workflow writes the same tag either way, so these two can&apos;t be split from GHL data alone.
                  </div>
                </>
              );
            })()}
          </div>

          {/* Email funnel: strictly sequential, same channel end to end.
              IG and phone used to be chained onto this and produced nonsense
              "% kept" numbers (e.g. 738%) because they're a separate channel,
              not a downstream step of email replies - now shown separately below. */}
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 24, alignItems: "stretch" }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="eyebrow muted" style={{ marginBottom: 22 }}>Email funnel</div>
              <Funnel
                rows={[
                  { label: "Scraped", value: num(data, "summary.total_gyms_scraped"), tone: "cold" },
                  { label: "Drafts created", value: num(data, "summary.total_drafts_created"), tone: "cold" },
                  { label: "Emails sent", value: num(data, "lead_gen.email_outreach_sent"), tone: "warm" },
                  { label: "Replied", value: num(data, "lead_gen.email_replied"), tone: "warm" },
                ]}
              />
            </div>
            <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
              <div className="eyebrow muted" style={{ marginBottom: 4 }}>Reply rate</div>
              <div style={{ color: "var(--ink-faint)", fontSize: 11.5, marginBottom: 18 }}>Replied \u00f7 sent - the same definition used everywhere else on this dashboard that says &quot;reply rate.&quot;</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Ring value={num(data, "lead_gen.email_replied")} total={num(data, "lead_gen.email_outreach_sent")} centerLabel="of emails sent" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>CrossFit vs HYROX</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>Same funnel, two lead sources: which one is actually pulling weight.</div>
            <Compare
              labelA="CrossFit"
              labelB="HYROX"
              rows={[
                { label: "Contacts in CRM", a: num(data, "lead_gen.crossfit_contacts_in_ghl"), b: num(data, "lead_gen.hyrox_contacts_in_ghl") },
                { label: "Hot leads", a: num(data, "lead_sources_enriched.cf_hot"), b: num(data, "lead_sources_enriched.hy_hot") },
                { label: "Warm leads", a: num(data, "lead_sources_enriched.cf_warm"), b: num(data, "lead_sources_enriched.hy_warm") },
                { label: "Drafts created", a: num(data, "lead_sources_drafts.cf_drafts_created"), b: num(data, "lead_sources_drafts.hy_drafts_created") },
              ]}
            />
            <div className="grid grid-2" style={{ gap: 16, marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--border-soft)" }}>
              <div>
                <div className="stat-label">CrossFit avg prospect score</div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 800, marginTop: 4 }}><Counter value={num(data, "lead_sources_enriched.cf_avg_prospect_score")} /></div>
              </div>
              <div>
                <div className="stat-label">HYROX avg prospect score</div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 800, marginTop: 4 }}><Counter value={num(data, "lead_sources_enriched.hy_avg_prospect_score")} /></div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Hot vs warm leads</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>Prospect score band, by source. Hot scores 65+, warm scores 20-64.</div>
            <Compare
              labelA="Hot"
              labelB="Warm"
              rows={[
                { label: "CrossFit", a: num(data, "lead_sources_enriched.cf_hot"), b: num(data, "lead_sources_enriched.cf_warm") },
                { label: "HYROX", a: num(data, "lead_sources_enriched.hy_hot"), b: num(data, "lead_sources_enriched.hy_warm") },
                { label: "Combined", a: num(data, "lead_sources_enriched.combined_hot"), b: num(data, "lead_sources_enriched.combined_warm") },
              ]}
            />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Direct vs generic email quality</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>A direct, named contact email scores well above a generic info@ inbox - this is how clean each source's contact data actually is.</div>
            <Compare
              labelA="Direct"
              labelB="Generic"
              rows={[
                { label: "CrossFit", a: num(data, "lead_sources_enriched.cf_direct_email"), b: num(data, "lead_sources_enriched.cf_generic_email") },
                { label: "HYROX", a: num(data, "lead_sources_enriched.hy_direct_email"), b: num(data, "lead_sources_enriched.hy_generic_email") },
              ]}
            />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Email vs Instagram</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>The two outbound channels, head to head - volume sent and what came back.</div>
            <Compare
              labelA="Email"
              labelB="Instagram"
              rows={[
                { label: "Outreach sent", a: num(data, "lead_gen.email_outreach_sent"), b: num(data, "lead_gen.ig_outreach_sent") },
                { label: "Replied (any outcome)", a: num(data, "lead_gen.email_replied"), b: sum(data, ["lead_gen.ig_replied_positive", "lead_gen.ig_replied_negative"]) },
              ]}
            />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Recently replied</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 18 }}>The actual gyms, not just the count - the last ones to write back, either channel. Live from GHL, capped to the most recent 20 server-side.</div>
            {(data?.lead_gen?.replied_contacts?.length ?? 0) > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {data!.lead_gen.replied_contacts.slice(0, 10).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderBottom: i < 9 ? "1px solid var(--border-soft)" : "none" }}>
                    <span style={{ fontSize: 13.5 }}>{c.name}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {c.touch != null && (
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "1px 6px" }}>T{c.touch}</span>
                      )}
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.channel}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)" }}>{c.time}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>No named replies in the current live payload yet.</div>
            )}
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Top locations</div>
            <GeoList rows={data?.geo_distribution || []} />
          </div>

          <div className="eyebrow muted" style={{ marginBottom: 12 }}>{flows.length} automations</div>
          <div className="grid grid-3">
            {flows.map((f) => (
              <FlowCard key={f.slug} f={f} data={data} backTo="/gym-owners" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
