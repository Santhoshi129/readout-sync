import { getReadout } from "@/lib/readout";
import { getLatestRunSummary, getRetentionFindings } from "@/lib/retention";
import { getRetentionMatrix, label as rmLabel } from "@/lib/retention-matrix";
import { FLOWS } from "@/lib/flows";
import { fmt } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { num, section } from "@/lib/dashboard-ui";

export const revalidate = 30;

export default async function Landing() {
  const { data, error, fetchedAt } = await getReadout();
  const [{ summary: retentionSummary }, { findings: retentionFindings }] = await Promise.all([
    getLatestRunSummary(),
    getRetentionFindings(),
  ]);
  const communityResearch = getRetentionMatrix();

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
              End-to-end gym acquisition: prospects are sourced, scored, and personally drafted, then carried through email, Instagram, and phone until they convert.
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
              Converts the existing membership base into active app users: members are identified, personally invited, and tracked through to adoption.
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

        <a href="/retention-signal" className="card click" style={{ padding: 40, marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <span className="chip" style={{ marginBottom: 16, display: "inline-flex" }}>Retention Research</span>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>Retention Signal</div>
              <div style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 28, maxWidth: 460 }}>
                Reads real gym-owner conversations on Reddit, has Claude extract and score the pain points and solutions, then checks each one against published industry data — every finding traceable back to its source.
              </div>
              <div style={{ display: "flex", gap: 32 }}>
                <div>
                  <div className="stat-label">Items scraped</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(retentionSummary?.total_items_scraped ?? null)}</div>
                </div>
                <div>
                  <div className="stat-label">Findings</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(retentionFindings.length)}</div>
                </div>
                <div>
                  <div className="stat-label">Industry-validated</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "var(--amber)" }}>{fmt(retentionSummary?.findings_industry_validated ?? null)}</div>
                </div>
              </div>
            </div>
            {retentionFindings.length > 0 && (
              <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 60 }}>
                {retentionFindings.slice(0, 8).map((f) => (
                  <div
                    key={f.finding_key}
                    title={f.pain_point}
                    style={{
                      width: 8, borderRadius: 3,
                      height: Math.max(10, Math.min(60, f.community_confidence_score * 6)),
                      background: f.confidence_band?.startsWith("Strong") ? "var(--hot)" : f.confidence_band?.startsWith("Moderate") ? "var(--amber)" : "var(--ink-faint)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </a>

        <a href="/retention-research" className="card click" style={{ padding: 40, marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <span className="chip" style={{ marginBottom: 16, display: "inline-flex" }}>Community Research</span>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>Community Research</div>
              <div style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, marginBottom: 28, maxWidth: 460 }}>
                Reddit discussions from r/CrossFit, r/HYROX, and r/GymOwners, classified against a fixed pain-point taxonomy and scored for effectiveness and difficulty — an independent read on why members actually leave.
              </div>
              <div style={{ display: "flex", gap: 32 }}>
                <div>
                  <div className="stat-label">Discussions analyzed</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(communityResearch.total_classified_items)}</div>
                </div>
                <div>
                  <div className="stat-label">Categories</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{fmt(communityResearch.matrix.length)}</div>
                </div>
                <div>
                  <div className="stat-label">Leading pain point</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--amber)" }}>{rmLabel(communityResearch.matrix[0]?.pain_point)}</div>
                </div>
              </div>
            </div>
          </div>
        </a>

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
