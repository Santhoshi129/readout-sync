import { getReadout } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring } from "@/components/Charts";
import { MemberBriefing } from "@/components/Briefing";
import { num, sum, section, Head, FlowCard } from "@/lib/dashboard-ui";

export const revalidate = 30;

export default async function MembersDashboard() {
  const { data, error, fetchedAt } = await getReadout();
  const flows = FLOWS.filter((f) => section(f.category) === "member").sort((a, b) => a.order - b.order);
  const launch = flows.reduce((min, f) => (f.goLive < min ? f.goLive : min), flows[0]?.goLive ?? fetchedAt);

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={fetchedAt} crossLinkHref="/gym-owners" crossLinkLabel="Gym owner outreach" />
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
          <span className="chip" style={{ marginBottom: 14, display: "inline-flex" }}>Blended Athletics</span>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Member outreach</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 680 }}>
            {flows.length} automations inviting existing members onto the TWU app.
          </p>
          <MemberBriefing data={data} launchIso={launch} />
        </section>

        <section className="section" style={{ borderTop: "none", paddingTop: 8 }}>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <Head label="Members identified" path="app_adoption.total_identified" data={data} flat />
            <Head label="Outreach sent" path="app_adoption.email_outreach_confirmed" data={data} />
            <Head label="In the community" path="app_adoption.total_joined" data={data} amber />
            <Head label="Adoption rate" path="app_adoption.adoption_rate_pct" data={data} suffix="%" />
          </div>

          {/* Sequential outreach funnel only - stops at "Adopted via outreach"
              (app_adoption.adopted). "Already on app" and "Total in community"
              are a different population who never went through this funnel at
              all, so they're shown separately below instead of chained on,
              which used to produce a nonsense "32500% kept" step. */}
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 24, alignItems: "stretch" }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="eyebrow muted" style={{ marginBottom: 22 }}>Outreach funnel</div>
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
                <Ring value={num(data, "app_adoption.total_joined")} total={num(data, "app_adoption.total_identified")} centerLabel="in the community" />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Community status</div>
            <Bars
              rows={[
                { label: "Already on app before outreach", value: num(data, "app_adoption.already_on_app"), tone: "cold" },
                { label: "Adopted via outreach", value: num(data, "app_adoption.adopted"), tone: "amber" },
                { label: "Total in community", value: num(data, "app_adoption.total_joined"), tone: "hot" },
                { label: "Opted out", value: num(data, "app_adoption.opted_out"), tone: "muted" },
                { label: "Confirmed not joining", value: num(data, "app_adoption.not_joining_confirmed"), tone: "muted" },
              ]}
            />
          </div>

          <div className="eyebrow muted" style={{ marginBottom: 12 }}>{flows.length} automations</div>
          <div className="grid grid-3">
            {flows.map((f) => (
              <FlowCard key={f.slug} f={f} data={data} backTo="/members" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
