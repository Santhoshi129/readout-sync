import { getReadout, getHistory, getSyncStatus } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars, Ring, Donut } from "@/components/Charts";
import { MemberBriefing } from "@/components/Briefing";
import { num, sum, section, Head, FlowCard } from "@/lib/dashboard-ui";
import { PipelineMap } from "@/components/PipelineMap";

export const revalidate = 30;

export default async function MembersDashboard() {
  const { data, error, fetchedAt } = await getReadout();
  const syncStatus = await getSyncStatus();
  const history = await getHistory("blended_readout_live", 14);
  const flows = FLOWS.filter((f) => section(f.category) === "member").sort((a, b) => a.order - b.order);
  const launch = flows.reduce((min, f) => (f.goLive < min ? f.goLive : min), flows[0]?.goLive ?? fetchedAt);

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={data?.meta?.generated_at || fetchedAt} crossLinkHref="/gym-owners" crossLinkLabel="Owner Outreach Intelligence" />
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
          <span className="chip" style={{ marginBottom: 14, display: "inline-flex" }}>Blended Athletics</span>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Member Adoption Pulse</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 16, marginTop: 14, maxWidth: 680 }}>
            {flows.length} automations converting the existing Blended Athletics membership into active TWU app users: identified, personally invited, and tracked to adoption. Every figure below is computed live from MongoDB, GHL, and Gmail state.
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

          <PipelineMap
            title="App Adoption pipeline, stage by stage"
            stages={[
              { name: "Drafted", count: num(data, "app_adoption.stage_drafted"), desc: "Invite drafted in Gmail, waiting on a human send.", tone: "cold" },
              { name: "Sent", count: num(data, "app_adoption.stage_sent"), desc: "Invite confirmed sent. The clock to follow-up starts here.", tone: "warm" },
              { name: "Follow-up", count: num(data, "app_adoption.stage_followup"), desc: "10 plus days with no reply, so a threaded follow-up went out.", tone: "amber" },
              { name: "Replied", count: num(data, "app_adoption.stage_replied"), desc: "Wrote back with something that needs review or a next step.", tone: "hot" },
              { name: "Adopted", count: num(data, "app_adoption.stage_adopted"), desc: "Joined the TWU app. The goal stage.", tone: "amber" },
              { name: "Not Joining", count: num(data, "app_adoption.stage_not_joining"), desc: "Explicitly confirmed they will not join.", tone: "muted" },
              { name: "Opted Out", count: num(data, "app_adoption.stage_opted_out"), desc: "Asked not to be contacted again.", tone: "muted" },
              { name: "No Response", count: num(data, "app_adoption.stage_no_response"), desc: "Follow-up sent, 4 to 5 plus days of silence. Closed by the Monday cleanup.", tone: "cold" },
            ]}
          />

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
                <Ring value={num(data, "app_adoption.total_joined")} total={num(data, "app_adoption.total_identified")} centerLabel="in the community" pctOverride={num(data, "app_adoption.adoption_rate_pct")} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Community status</div>
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


          {/* 14-day trend card removed for now - history snapshots include
              zeros from failed/partial sync runs, producing fake crater dips
              that misrepresent real activity. Re-add once the history
              writer skips failed runs instead of logging 0. */}

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
