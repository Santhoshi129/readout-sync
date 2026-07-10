import { getReadout } from "@/lib/readout";
import { FLOWS } from "@/lib/flows";
import { fmt } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { num, section } from "@/lib/dashboard-ui";

export const revalidate = 30;

export default async function Landing() {
  const { data, error, fetchedAt } = await getReadout();

  const gymOwnerFlows = FLOWS.filter((f) => section(f.category) === "gym-owner");
  const memberFlows = FLOWS.filter((f) => section(f.category) === "member");
  const platformFlows = FLOWS.filter((f) => section(f.category) === "platform");

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={fetchedAt} />
      <div className="wrap">
        {error && (
          <div className="banner err" style={{ marginTop: 28 }}>
            The Readout is unreachable right now ({error}). Numbers below will fill in as soon as it responds.
          </div>
        )}

        <section style={{ padding: "56px 0 40px" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>TWU Automations</div>
          <div className="hero-num">{FLOWS.length}</div>
          <div style={{ color: "var(--ink-dim)", fontSize: 15, marginTop: 10 }}>
            Two separate systems. Pick one to see its full report.
          </div>
        </section>

        <div className="grid grid-2" style={{ gap: 24, marginBottom: 32 }}>
          <a href="/gym-owners" className="card click" style={{ padding: 40 }}>
            <span className="chip" style={{ marginBottom: 16, display: "inline-flex" }}>Train With Us</span>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>Owner Outreach Intelligence</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 28, maxWidth: 440 }}>
              Cold gyms scraped, scored, drafted, and worked through email, Instagram, and phone until they reply.
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <div className="stat-label">Automations</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{gymOwnerFlows.length}</div>
              </div>
              <div>
                <div className="stat-label">Contacts in CRM</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(num(data, "lead_gen.total_contacts_in_ghl"))}</div>
              </div>
              <div>
                <div className="stat-label">Replied</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "var(--amber)" }}>{fmt(num(data, "lead_gen.email_replied"))}</div>
              </div>
            </div>
          </a>

          <a href="/members" className="card click" style={{ padding: 40 }}>
            <span className="chip" style={{ marginBottom: 16, display: "inline-flex" }}>Blended Athletics</span>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>Member Adoption Pulse</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 28, maxWidth: 440 }}>
              Existing members not yet on the TWU app, identified and invited, with adoption tracked to done.
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <div className="stat-label">Automations</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{memberFlows.length}</div>
              </div>
              <div>
                <div className="stat-label">Members identified</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(num(data, "app_adoption.total_identified"))}</div>
              </div>
              <div>
                <div className="stat-label">In the community</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "var(--amber)" }}>{fmt(num(data, "app_adoption.total_joined"))}</div>
              </div>
            </div>
          </a>
        </div>

        {platformFlows.map((f) => (
          <a key={f.slug} href={`/flows/${f.slug}?from=/`} className="card click" style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
            <div>
              <div className="stat-label" style={{ marginBottom: 4 }}>Platform</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{f.name}</div>
            </div>
            <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>{f.oneLine}</div>
          </a>
        ))}

        <div className="foot">
          TWU Automations Dashboard · live data via the 5 minute Readout cache sync, with on-demand refresh from the top bar.
        </div>
      </div>
    </>
  );
}
