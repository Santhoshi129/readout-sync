import { getReadout } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring, Compare, GeoList } from "@/components/Charts";
import { Counter } from "@/components/Counter";
import { GymOwnerBriefing } from "@/components/Briefing";
import { Diagnostics } from "@/components/Diagnostics";
import { num, section, Head, FlowCard } from "@/lib/dashboard-ui";

export const revalidate = 30;

export default async function GymOwnersDashboard() {
  const { data, error, fetchedAt } = await getReadout();
  const flows = FLOWS.filter((f) => section(f.category) === "gym-owner").sort((a, b) => a.order - b.order);
  const launch = flows.reduce((min, f) => (f.goLive < min ? f.goLive : min), flows[0]?.goLive ?? fetchedAt);

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={fetchedAt} crossLinkHref="/members" crossLinkLabel="Member outreach" />
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
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Gym owner outreach</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 680 }}>
            {flows.length} automations reaching cold gyms through email, Instagram, and phone.
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
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Reply breakdown</div>
            <Bars
              rows={[
                { label: "Interested", value: num(data, "reply_breakdown.interested"), tone: "hot" },
                { label: "Not interested", value: num(data, "reply_breakdown.not_interested"), tone: "muted" },
                { label: "Auto-responder", value: num(data, "reply_breakdown.auto_responder"), tone: "amber" },
                { label: "Auto-ack", value: num(data, "reply_breakdown.auto_ack"), tone: "amber" },
                { label: "Other", value: num(data, "reply_breakdown.other"), tone: "cold" },
              ]}
            />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>CrossFit vs HYROX</div>
            <div style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 22 }}>Same funnel, two channels — which one's actually pulling weight.</div>
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
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Top locations</div>
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
