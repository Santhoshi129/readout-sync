// app/kpi-overview/page.tsx
// Draft KPI landing page for Dave/Kimberly, scoped to the framing from the
// team call: "is this successful, is this growing, and where are the
// problems" - not a revenue view (excluded per Alex's framing) and not an
// attendance view (that feed - Studio OS/Morning Brief - isn't wired into
// this sync yet; no invented numbers here).
//
// Deliberately NOT linked from app/page.tsx or any nav. Only reachable by
// someone who has this exact URL. Do not add a link to it from the home
// dashboard until this is ready to share with Dave's team.
import { getReadout, getHistory, getSyncStatus } from "@/lib/readout";
import { Topbar } from "@/components/Topbar";
import { Trend } from "@/components/Charts";
import { num, sum, Head } from "@/lib/dashboard-ui";
import { Counter } from "@/components/Counter";

export const revalidate = 30;

export default async function KpiOverview() {
  const { data, error, fetchedAt } = await getReadout();
  const syncStatus = await getSyncStatus();
  const leadHistory = await getHistory("twu_readout_live", 30);
  const adoptionHistory = await getHistory("blended_readout_live", 30);

  const totalOutreach = sum(data, ["lead_gen.email_outreach_sent", "app_adoption.email_outreach_confirmed"]);
  const totalReplied = sum(data, ["lead_gen.email_replied", "app_adoption.stage_replied"]);

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
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 680 }}>
            One page to answer three questions: is this working, is it growing, and where are the problems.
            Revenue and class-attendance numbers are intentionally left off — revenue isn&apos;t the framing this
            was scoped around, and attendance comes from a feed (Studio OS / Morning Brief) that isn&apos;t
            connected to this sync yet. Everything below is real, live data — nothing here is invented.
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

        {/* Is this working */}
        <section className="section" style={{ borderTop: "none", paddingTop: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Is this working</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginBottom: 16 }}>
            Outreach and adoption funnels, at a glance.
          </p>
          <div className="grid grid-4" style={{ marginBottom: 14 }}>
            <Head label="Gym owner contacts in CRM" path="lead_gen.total_contacts_in_ghl" data={data} />
            <div className="card">
              <div className="stat-label">Emails sent (owners + members)</div>
              <div className="stat-value amber">
                {totalOutreach == null ? "—" : <Counter value={totalOutreach} />}
              </div>
            </div>
            <Head label="Owner reply rate" path="lead_gen.email_reply_rate_pct" data={data} suffix="%" />
            <Head label="Member app adoption rate" path="app_adoption.adoption_rate_pct" data={data} suffix="%" />
          </div>
          <div className="grid grid-4">
            <Head label="Hot leads" path="lead_gen.hot_leads" data={data} />
            <Head label="Warm leads" path="lead_gen.warm_leads" data={data} />
            <Head label="Members identified" path="app_adoption.total_identified" data={data} />
            <Head label="Members joined app" path="app_adoption.total_joined" data={data} />
          </div>
        </section>

        {/* Is this growing */}
        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Is this growing</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginBottom: 16 }}>
            Last 30 days, from the same snapshots the sync has been appending every run.
          </p>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink-dim)", marginBottom: 8 }}>Gym owner outreach — contacts &amp; replies</div>
            <Trend
              points={leadHistory}
              series={[
                { key: "total_contacts_in_ghl", label: "Contacts in CRM", tone: "cool" },
                { key: "email_replied", label: "Replied", tone: "warm" },
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 13.5, color: "var(--ink-dim)", marginBottom: 8 }}>Member app adoption rate (%)</div>
            <Trend
              points={adoptionHistory}
              series={[{ key: "adoption_rate_pct", label: "Adoption rate", tone: "good" }]}
            />
          </div>
        </section>

        {/* Where are the problems */}
        <section className="section">
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Where are the problems</h2>
          <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginBottom: 16 }}>
            Stuck, unresponsive, or opted-out volume worth a look.
          </p>
          <div className="grid grid-4">
            <Head label="Owner leads gone cold" path="lead_gen.stage_no_response" data={data} amber />
            <Head label="Members opted out" path="app_adoption.opted_out" data={data} amber />
            <Head label="Members no response" path="app_adoption.no_response" data={data} amber />
            <Head label="Needs manual review" path="app_adoption.needs_dave_review" data={data} amber />
          </div>
        </section>
      </div>
    </>
  );
}
