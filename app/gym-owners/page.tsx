import { getReadout, getHistory } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring, Compare, Donut, GeoList, Trend } from "@/components/Charts";
import { Counter } from "@/components/Counter";
import { GymOwnerBriefing } from "@/components/Briefing";
import { Diagnostics } from "@/components/Diagnostics";
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
            title="New Leads pipeline, stage by stage"
            note="The live shape of the gym owner pipeline in GHL. Hover or click a stage for what it means. A contact's outreach stage maps directly to its touch step."
            stages={[
              { name: "New Lead Acquired", count: num(data, "lead_gen.stage_new_lead"), desc: "First touch confirmed sent by David. The contact is now in the 5-touch email sequence.", tone: "cold" },
              { name: "Responded", count: num(data, "lead_gen.stage_responded"), desc: "Replied with real interest or a real conversation, at whatever touch its outreach step shows. The goal stage.", tone: "amber" },
              { name: "No Response", count: num(data, "lead_gen.stage_no_response"), desc: "All 5 touches completed with silence. Waiting on or working through the Instagram channel.", tone: "warm" },
              { name: "Instagram Outreach", count: num(data, "lead_gen.stage_ig_outreach"), desc: "In the IG channel: handle found, DM queued or sent by Mari, phone follow-up if still silent.", tone: "hot" },
              { name: "Alt Outreaching", count: num(data, "alt_email_outreach.in_alt_outreaching_stage"), desc: "An auto-responder or IG reply redirected us to a different email address; the 3-touch alt sequence is working it.", tone: "cold" },
              { name: "Dead Lead", count: num(data, "lead_gen.stage_dead"), desc: "Unsubscribed or said no, recorded at the exact touch it happened.", tone: "muted" },
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
              return (
                <Bars
                  rows={[
                    { label: `Email (${fmt(emailSent)} sent)`, value: rate(emailReplied, emailSent), tone: "amber" },
                    { label: `Instagram (${fmt(igSent)} sent)`, value: rate(igReplied, igSent), tone: "hot" },
                    { label: `Phone (${fmt(phoneResolved)} resolved)`, value: rate(phonePositive, phoneResolved), tone: "warm" },
                  ]}
                />
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
              <div className="eyebrow muted" style={{ marginBottom: 22 }}>Reply rate</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Ring value={num(data, "lead_gen.email_replied")} total={num(data, "lead_gen.email_outreach_sent")} centerLabel="of emails sent" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Instagram channel</div>
            <Bars
              rows={[
                { label: "Ready to send", value: num(data, "lead_gen.ig_outreach_ready"), tone: "cold" },
                { label: "DMs sent", value: num(data, "lead_gen.ig_outreach_sent"), tone: "warm" },
                { label: "Replied positive", value: num(data, "lead_gen.ig_replied_positive"), tone: "hot" },
                { label: "Replied negative", value: num(data, "lead_gen.ig_replied_negative"), tone: "muted" },
              ]}
            />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Reply breakdown</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>What every classified reply turned out to be. Hover a slice or a row for its share.</div>
            <Donut
              centerLabel="classified"
              segments={[
                { label: "Interested", value: num(data, "reply_breakdown.interested"), tone: "hot" },
                { label: "Not interested", value: num(data, "reply_breakdown.not_interested"), tone: "bad" },
                { label: "Auto-responder", value: num(data, "reply_breakdown.auto_responder"), tone: "warm" },
                { label: "Auto-ack", value: num(data, "reply_breakdown.auto_ack"), tone: "amber" },
                { label: "Other", value: num(data, "reply_breakdown.other"), tone: "muted" },
              ]}
            />
            {(() => {
              const classified = num(data, "reply_breakdown.total_classified") ?? 0;
              const knownReplies = num(data, "lead_gen.email_replied") ?? 0;
              return classified < knownReplies ? (
                <div className="stat-flag" style={{ marginTop: 18 }}>
                  Classified total ({classified}) is lower than replies recorded elsewhere ({knownReplies}) - the Reply Detector classifier is behind the raw reply count upstream. Flagged, not faked; see the Reply Detector flow page for the known gap.
                </div>
              ) : null;
            })()}
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
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 18 }}>The actual gyms, not just the count - the last ones to write back, either channel.</div>
            {(data?.lead_gen?.replied_contacts?.length ?? 0) > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {data!.lead_gen.replied_contacts.slice(0, 10).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 4px", borderBottom: i < 9 ? "1px solid var(--border-soft)" : "none" }}>
                    <span style={{ fontSize: 13.5 }}>{c.name}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

          <Diagnostics data={data} />


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
