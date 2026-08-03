// app/kpi-overview/page.tsx
// Draft KPI landing page for Dave/Kimberly, scoped to the framing from the
// team call: "is this successful, is this growing, and where are the
// problems." Deliberately excludes two things, on purpose, not by oversight:
//   - Revenue/profit-loss: no billing or revenue source is connected
//     anywhere in this pipeline (confirmed - not just unwired). Per Alex's
//     own framing of the goal, this was never the point of the ask anyway.
//   - Class attendance (HYROX/Ground Zero/Open Gym/PT): that feed lives in
//     Dave's separate Morning Brief automation (Studio OS or similar), not
//     in this sync. Adding it here would mean guessing at numbers, which
//     this file will not do.
// Also deliberately excludes raw data-integrity/canary diagnostics - the
// team already asked for that kind of internal plumbing view to be removed
// from the live dashboards; this page stays business-facing.
//
// NOT linked from app/page.tsx or any nav - only reachable by direct URL.
// Do not add a link to it from the home dashboard until it's ready to share.
import { getReadout, getHistory, getSyncStatus } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { combinedDataset } from "@/lib/retention-research";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring, Donut, Compare, GeoList, Trend } from "@/components/Charts";
import { Counter } from "@/components/Counter";
import { num, sum, Head, FlowCard } from "@/lib/dashboard-ui";
import { fmt } from "@/lib/format";
import type { HistoryPoint } from "@/lib/readout";

export const revalidate = 30;

// A raw 10-minute-cadence history plotted straight across 30 days is noisy
// even when every point is real, and a partial/failed sync run can write a
// low-but-nonzero count - not caught by a simple "is it exactly 0" check -
// which shows up as a sharp fake drop on the line. This does two things:
//   1. Rejects any point where a monotonic metric (one that can only ever
//      grow - contacts, replies, and joins never legitimately shrink by a
//      quarter between two 10-minute syncs) drops more than 25% below the
//      running last-good value. That's a corrupted/partial write, not real
//      activity, so it's excluded rather than plotted as a crash.
//   2. Downsamples to one point per calendar day (the last accepted
//      snapshot of that day) - cleaner to read, and matches what a "30-day
//      trend" actually means rather than showing 10-minute jitter.
function cleanDailyTrend(points: HistoryPoint[], monotonicKeys: string[]): HistoryPoint[] {
  const lastGood: Record<string, number> = {};
  const accepted: HistoryPoint[] = [];
  for (const p of points) {
    const corrupt = monotonicKeys.some((k) => {
      const v = p.metrics[k] ?? 0;
      const prev = lastGood[k];
      return prev != null && prev > 0 && v < prev * 0.75;
    });
    if (corrupt) continue;
    monotonicKeys.forEach((k) => {
      const v = p.metrics[k] ?? 0;
      if (lastGood[k] == null || v > lastGood[k]) lastGood[k] = v;
    });
    accepted.push(p);
  }
  const byDay = new Map<string, HistoryPoint>();
  for (const p of accepted) byDay.set(p.ts.slice(0, 10), p);
  return Array.from(byDay.values());
}

export default async function KpiOverview() {
  const { data, error, fetchedAt } = await getReadout();
  const syncStatus = await getSyncStatus();
  const leadHistoryRaw = await getHistory("twu_readout_live", 30);
  const adoptionHistoryRaw = await getHistory("blended_readout_live", 30);
  const leadHistory = cleanDailyTrend(leadHistoryRaw, ["total_contacts_in_ghl", "email_replied", "hot_leads"]);
  const adoptionHistory = cleanDailyTrend(adoptionHistoryRaw, ["total_identified", "total_joined"]);
  const retention = combinedDataset();
  const allFlows = [...FLOWS].sort((a, b) => a.order - b.order);

  const emailSent = num(data, "lead_gen.email_outreach_sent") ?? 0;
  const emailReplied = num(data, "lead_gen.email_replied") ?? 0;
  const igSent = num(data, "lead_gen.ig_outreach_sent") ?? 0;
  const igReplied = sum(data, ["lead_gen.ig_replied_positive", "lead_gen.ig_replied_negative"]) ?? 0;
  const phoneResolved = num(data, "lead_gen.phone_resolved") ?? 0;
  const phonePositive = num(data, "lead_gen.phone_positive") ?? 0;
  const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={data?.meta?.generated_at || fetchedAt} />
      <div className="wrap">
        <div style={{ paddingTop: 28 }}>
          <a className="back" href="/">← All dashboards</a>
        </div>

        <section style={{ padding: "28px 0 0" }}>
          <span className="chip" style={{ marginBottom: 14, display: "inline-flex" }}>Draft — not yet shared with the team</span>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            KPI Overview
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 700 }}>
            Everything below is real, live data pulled from the same GHL / Sheets / MongoDB sync the rest of
            the Readout runs on — nothing here is estimated or invented. Two things are intentionally left out:
            revenue/profit-loss (no billing source is connected anywhere yet, and it wasn&apos;t the actual
            framing of this ask) and class attendance (a separate feed this sync doesn&apos;t touch).
          </p>
        </section>

        {error && (
          <div className="banner err" style={{ marginTop: 20 }}>
            The Readout is unreachable right now ({error}). Numbers below will fill in as soon as it responds.
          </div>
        )}
        {syncStatus && !syncStatus.ok && (
          <div className="banner err" style={{ marginTop: 20 }}>
            Sync is failing. Everything below is from the last time it worked
            {syncStatus.last_success_at ? ` (${new Date(syncStatus.last_success_at).toLocaleString()})` : ""}.
            Last attempt failed with: {syncStatus.last_error || "unknown error"}.
          </div>
        )}

        <section className="section" style={{ borderTop: "none", paddingTop: 8 }}>
          <p style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 16 }}>
            One point per day, last 30 days. Corrupted snapshots from partial/failed sync runs are excluded rather than plotted.
          </p>
          <div className="card" style={{ padding: 32, marginBottom: 20 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Gym owner outreach — 30 days</div>
            <Trend
              points={leadHistory}
              series={[
                { key: "total_contacts_in_ghl", label: "Contacts in CRM", tone: "cold" },
                { key: "email_replied", label: "Replied", tone: "hot" },
                { key: "hot_leads", label: "Hot leads", tone: "amber" },
              ]}
              height={280}
            />
          </div>
          <div className="card" style={{ padding: 32 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Member app adoption — 30 days</div>
            <Trend
              points={adoptionHistory}
              series={[
                { key: "total_identified", label: "Identified", tone: "cold" },
                { key: "total_joined", label: "Joined", tone: "hot" },
              ]}
              height={280}
            />
          </div>
        </section>

        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>More detail — outreach &amp; adoption</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginBottom: 16 }}>
            Gym-owner outreach and member adoption, side by side.
          </p>
          <div className="grid grid-4" style={{ marginBottom: 14 }}>
            <Head label="Gym owner contacts in CRM" path="lead_gen.total_contacts_in_ghl" data={data} />
            <Head label="Owner reply rate" path="lead_gen.email_reply_rate_pct" data={data} suffix="%" />
            <Head label="Members identified" path="app_adoption.total_identified" data={data} />
            <Head label="Member app adoption rate" path="app_adoption.adoption_rate_pct" data={data} suffix="%" />
          </div>
          <div className="grid grid-4">
            <Head label="Hot leads" path="lead_gen.hot_leads" data={data} />
            <Head label="Warm leads" path="lead_gen.warm_leads" data={data} />
            <Head label="Members joined app" path="app_adoption.total_joined" data={data} amber />
            <Head label="Total in pipeline" path="lead_gen.total_in_pipeline" data={data} />
          </div>
        </section>


        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Funnels</h2>
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 24, alignItems: "stretch" }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="eyebrow muted" style={{ marginBottom: 22 }}>Email funnel (gym owners)</div>
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
              <div className="eyebrow muted" style={{ marginBottom: 18 }}>Owner reply rate</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Ring value={num(data, "lead_gen.email_replied")} total={num(data, "lead_gen.email_outreach_sent")} centerLabel="of emails sent" pctOverride={num(data, "lead_gen.email_reply_rate_pct")} />
              </div>
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 24, alignItems: "stretch" }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="eyebrow muted" style={{ marginBottom: 22 }}>App adoption funnel (members)</div>
              <Funnel
                rows={[
                  { label: "Identified", value: num(data, "app_adoption.total_identified"), tone: "cold" },
                  { label: "Outreach sent", value: sum(data, ["app_adoption.email_outreach_confirmed", "app_adoption.followup_confirmed"]), tone: "warm" },
                  { label: "Replied", value: num(data, "app_adoption.stage_replied"), tone: "warm" },
                  { label: "Adopted via outreach", value: num(data, "app_adoption.adopted"), tone: "amber" },
                ]}
              />
            </div>
            <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
              <div className="eyebrow muted" style={{ marginBottom: 22 }}>Community coverage</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <Ring value={num(data, "app_adoption.total_joined")} total={num(data, "app_adoption.total_identified")} centerLabel="in the community" pctOverride={num(data, "app_adoption.adoption_rate_pct")} />
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Channel effectiveness</h2>
          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            {(() => {
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
                      {best.label} converts best at {best.value}% — {(best.value / Math.max(worst.value, 0.1)).toFixed(1)}x {worst.label}&apos;s {worst.value}%.
                    </div>
                  )}
                  <Bars
                    rows={[
                      { label: `Email — ${fmt(emailReplied)}/${fmt(emailSent)} replied`, value: rate(emailReplied, emailSent), tone: "amber" },
                      { label: `Instagram — ${fmt(igReplied)}/${fmt(igSent)} replied`, value: rate(igReplied, igSent), tone: "hot" },
                      { label: `Phone — ${fmt(phonePositive)}/${fmt(phoneResolved)} positive`, value: rate(phonePositive, phoneResolved), tone: "warm" },
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

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Community status (members)</div>
            <Donut
              centerLabel="identified"
              segments={[
                { label: "Already on app before outreach", value: num(data, "app_adoption.already_on_app"), tone: "cold" },
                { label: "Adopted via outreach", value: num(data, "app_adoption.adopted"), tone: "hot" },
                { label: "Opted out", value: num(data, "app_adoption.opted_out"), tone: "bad" },
                { label: "Confirmed not joining", value: num(data, "app_adoption.not_joining_confirmed"), tone: "muted" },
              ]}
            />
          </div>
        </section>

        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Lead quality &amp; mix</h2>
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
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Franchise mix (gym owner leads)</div>
            <Bars
              rows={[
                { label: "Independent", value: num(data, "franchise_mix.independent"), tone: "cold" },
                { label: "F45", value: num(data, "franchise_mix.f45"), tone: "warm" },
                { label: "Orangetheory", value: num(data, "franchise_mix.orangetheory"), tone: "amber" },
                { label: "Shred415", value: num(data, "franchise_mix.shred415"), tone: "hot" },
              ]}
            />
          </div>
          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 4 }}>Top locations</div>
            <GeoList rows={data?.geo_distribution || []} />
          </div>
        </section>

        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Retention research</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginBottom: 16 }}>
            Community pain-point research, classified — separate static dataset, not part of the live sync.
          </p>
          <div className="grid grid-2" style={{ gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <div className="stat-label">Posts/comments analyzed</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 800, marginTop: 6 }}>
                <Counter value={retention.total_analyzed} />
              </div>
            </div>
            <div className="card" style={{ padding: 28 }}>
              <div className="stat-label">Relevant findings</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 34, fontWeight: 800, marginTop: 6 }}>
                <Counter value={retention.relevant_count} />
              </div>
            </div>
          </div>
          <a className="back" style={{ marginTop: 16, display: "inline-block" }} href="/retention-research">Full retention research →</a>
        </section>

        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Where are the problems</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginBottom: 16 }}>
            Stuck, unresponsive, or opted-out volume worth a look — not raw technical diagnostics, just the business-relevant flags.
          </p>
          <div className="grid grid-4" style={{ marginBottom: 14 }}>
            <Head label="Owner leads gone cold" path="lead_gen.stage_no_response" data={data} amber />
            <Head label="Owner leads dead" path="lead_gen.stage_dead" data={data} amber />
            <Head label="Members opted out" path="app_adoption.opted_out" data={data} amber />
            <Head label="Members no response" path="app_adoption.no_response" data={data} amber />
          </div>
          <div className="grid grid-4">
            <Head label="Needs manual review (IG bridge)" path="ig_bridge_outreach.needs_review" data={data} amber />
            <Head label="Needs Dave review (adoption)" path="app_adoption.needs_dave_review" data={data} amber />
            <Head label="Confirmed not joining" path="app_adoption.not_joining_confirmed" data={data} />
            <Head label="No email on file" path="app_adoption.no_email_count" data={data} />
          </div>
        </section>

        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>All automations ({allFlows.length})</h2>
          <div className="grid grid-3">
            {allFlows.map((f) => (
              <FlowCard key={f.slug} f={f} data={data} backTo="/kpi-overview" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
