import { getReadout, getHistory, getSyncStatus } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring, Compare, GeoList, Donut } from "@/components/Charts";
import { Counter } from "@/components/Counter";
import { GymOwnerBriefing } from "@/components/Briefing";
import { num, sum, section, Head, FlowCard } from "@/lib/dashboard-ui";
import { PipelineMap } from "@/components/PipelineMap";
import { fmt } from "@/lib/format";

export const revalidate = 30;

export default async function GymOwnersDashboard() {
  const { data, error, fetchedAt } = await getReadout();
  const syncStatus = await getSyncStatus();
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

        {syncStatus && !syncStatus.ok && (
          <div className="banner err" style={{ marginTop: 20 }}>
            Sync is failing. Everything below is from the last time it worked{syncStatus.last_success_at ? ` (${new Date(syncStatus.last_success_at).toLocaleString()})` : ""}, not current data. Last attempt{syncStatus.last_attempt_at ? ` at ${new Date(syncStatus.last_attempt_at).toLocaleString()}` : ""} failed with: {syncStatus.last_error || "unknown error"}.
          </div>
        )}

        {(() => {
          // A staleness check independent of sync_status even existing -
          // covers the case where the app's own Mongo read connection works
          // fine (so it happily serves old cached data with no error) while
          // the separate GitHub Actions sync has never once written to it.
          // Two different MONGODB_URI values in two different places
          // (Vercel env vars for reads, GitHub Secrets for the sync writes)
          // is exactly the kind of split that produces this.
          const genAt = data?.meta?.generated_at;
          if (!genAt || (syncStatus && !syncStatus.ok)) return null;
          const ageMin = (Date.now() - new Date(genAt).getTime()) / 60000;
          if (ageMin < 20) return null;
          return (
            <div className="banner err" style={{ marginTop: 20 }}>
              This data is {Math.round(ageMin)} minutes old. The sync should refresh every 10. Either it&apos;s not running, or it&apos;s writing somewhere this page isn&apos;t reading from. Numbers below are real, just not current.
            </div>
          );
        })()}

        <section style={{ padding: "28px 0 0" }}>
          <span className="chip" style={{ marginBottom: 14, display: "inline-flex" }}>Train With Us</span>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Owner Outreach Intelligence</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 680 }}>
            {flows.length} automations running the full gym-owner acquisition motion, from first contact through email, Instagram, and phone to a booked reply. Every figure below is computed live from GHL, Sheets, and MongoDB. Nothing is entered by hand.
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
            title="Lead journey, stage by stage"
            stages={[
              { name: "New Lead Acquired", count: num(data, "lead_gen.stage_new_lead"), desc: "First email just went out. In the 5-touch sequence now.", tone: "cold" },
              {
                name: "Responded", count: num(data, "lead_gen.stage_responded"),
                desc: "A genuinely interested reply, from either the email sequence or Alt Outreaching. Nothing moves past this, it's the goal.",
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
                desc: "DM sent. Positive, negative, and phone-due outcomes all stay parked at this same stage, only the tag changes.",
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
                      &quot;Phone due&quot; only counts contacts past the 10-day no-reply mark. Most DM&apos;d contacts haven&apos;t hit that yet.
                    </div>
                  </div>
                ),
              },
              {
                name: "Phone Follow-up", count: num(data, "lead_gen.phone_followup_due"),
                desc: "A tag, not a pipeline stage. Fires when a DM got no reply past the follow-up window.",
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
              { name: "Dead Lead", count: num(data, "lead_gen.stage_dead"), desc: "Unsubscribed or said no. Reachable from New Lead, Instagram, or Alt Outreaching, not only the end of a finished sequence.", tone: "muted" },
            ]}
          />

          {/* 14-day trend card removed for now - history snapshots include
              zeros from failed/partial sync runs, producing fake crater dips
              that misrepresent real activity. Re-add once the history
              writer skips failed runs instead of logging 0. */}

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Channel effectiveness</div>
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

          <div className="eyebrow muted" style={{ marginBottom: 16 }}>Reply intelligence</div>
          <div className="grid grid-4" style={{ gap: 16, marginBottom: 24, alignItems: "start" }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Email</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>via Reply Detector</div>
              <Donut
                size={110}
                compact
                centerLabel="replied"
                centerValue={num(data, "lead_gen.email_replied")}
                segments={[
                  { label: "Positive", value: num(data, "reply_breakdown.interested"), tone: "hot" },
                  { label: "Negative", value: num(data, "reply_breakdown.not_interested"), tone: "bad" },
                  { label: "Auto-responder", value: num(data, "reply_breakdown.auto_responder"), tone: "warm" },
                  { label: "Auto-ack", value: num(data, "reply_breakdown.auto_ack"), tone: "amber" },
                  { label: "Other", value: num(data, "reply_breakdown.other"), tone: "muted" },
                ]}
              />
              {(() => {
                const classified = num(data, "reply_breakdown.total_classified") ?? 0;
                const knownReplies = num(data, "lead_gen.email_replied") ?? 0;
                if (classified === knownReplies) return null;
                const behind = classified < knownReplies;
                return (
                  <div className="stat-flag" style={{ marginTop: 12, fontSize: 10.5 }}>
                    Classified ({classified}) {behind ? "trails" : "exceeds"} raw ({knownReplies}).
                  </div>
                );
              })()}
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Instagram, main</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>Mari, by hand</div>
              <Donut
                size={110}
                compact
                centerLabel="replied"
                segments={[
                  { label: "Positive", value: num(data, "lead_gen.ig_replied_positive"), tone: "hot" },
                  { label: "Negative", value: num(data, "lead_gen.ig_replied_negative"), tone: "bad" },
                ]}
              />
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Alt, email redirect</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>Auto-responder feeder</div>
              <Donut
                size={110}
                compact
                centerLabel="replied"
                segments={[
                  { label: "Interested", value: num(data, "alt_email_outreach.interested"), tone: "hot" },
                  { label: "Not interested", value: num(data, "alt_email_outreach.not_interested"), tone: "bad" },
                ]}
              />
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Alt, IG Bridge</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>IG reply + redirect feeder</div>
              <Donut
                size={110}
                compact
                centerLabel="replied"
                segments={[
                  { label: "Interested", value: num(data, "ig_bridge_outreach.replied_interested"), tone: "hot" },
                  { label: "Not interested", value: num(data, "ig_bridge_outreach.replied_not_interested"), tone: "bad" },
                  { label: "Auto-ack", value: num(data, "ig_bridge_outreach.auto_ack"), tone: "amber" },
                  { label: "Needs review", value: num(data, "ig_bridge_outreach.needs_review"), tone: "muted" },
                ]}
              />
            </div>
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
              <div className="eyebrow muted" style={{ marginBottom: 18 }}>Reply rate</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Ring value={num(data, "lead_gen.email_replied")} total={num(data, "lead_gen.email_outreach_sent")} centerLabel="of emails sent" pctOverride={num(data, "lead_gen.email_reply_rate_pct")} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>CrossFit vs HYROX</div>
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
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Hot vs warm leads</div>
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
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Direct vs generic email quality</div>
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
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Email vs Instagram</div>
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
