import { getReadout, pick, Readout } from "@/lib/readout";
import { FLOWS, Flow } from "@/lib/flows";
import { fmt } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { Funnel, Bars } from "@/components/Charts";

// Not force-dynamic anymore: that setting overrides fetch-level revalidation
// and forces a brand-new n8n execution on every single page load. Now the page
// revalidates on the same 30s cadence as the fetch in lib/readout.ts.
export const revalidate = 30;

function health(f: Flow): "good" | "watch" | "gap" {
  if (f.changelog.some((c) => c.status === "gap")) return "gap";
  if (f.changelog.some((c) => c.status === "monitoring" || c.status === "in-progress")) return "watch";
  return "good";
}

// Every flow already carries a category from lib/flows.ts. Acquisition,
// signal, and hygiene flows are all infrastructure for the same system -
// reaching out to gym owners for Train With Us. Adoption flows are the
// separate system reaching out to existing members for Blended Athletics.
// Platform is the dashboard itself, not an outreach automation.
function section(cat: Flow["category"]): "gym-owner" | "member" | "platform" {
  if (cat === "adoption") return "member";
  if (cat === "platform") return "platform";
  return "gym-owner";
}

const CANARIES: { label: string; path: string; expect: string }[] = [
  { label: "Stuck draft tags", path: "data_integrity.stuck_draft_tags", expect: "≈ 0" },
  { label: "Step / tag mismatch", path: "data_integrity.step_tag_mismatch", expect: "≈ 0" },
  { label: "IG unmatched dupes", path: "data_integrity.ig_unmatched_duplicates", expect: "low" },
  { label: "IG bridge stuck", path: "data_integrity.ig_bridge_stuck_pending", expect: "watch" },
  { label: "Stuck past resume", path: "data_integrity.stuck_past_resume_date", expect: "≈ 0" },
  { label: "Missing resume date", path: "data_integrity.missing_resume_date", expect: "≈ 0" },
  { label: "Legacy IG tag", path: "data_integrity.legacy_ig_bridge_stuck_tag", expect: "→ 0" },
];

export default async function Home() {
  const { data, error, fetchedAt } = await getReadout();

  const gymOwnerFlows = [...FLOWS].filter((f) => section(f.category) === "gym-owner").sort((a, b) => a.order - b.order);
  const memberFlows = [...FLOWS].filter((f) => section(f.category) === "member").sort((a, b) => a.order - b.order);
  const platformFlows = [...FLOWS].filter((f) => section(f.category) === "platform").sort((a, b) => a.order - b.order);
  const totalAutomations = FLOWS.length;

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={fetchedAt} />
      <div className="wrap">
        {error && (
          <div className="banner err" style={{ marginTop: 28 }}>
            The Readout is unreachable right now ({error}). Numbers below will fill in as soon as it responds.
          </div>
        )}

        {/* HEADER: plain count, no promotional copy */}
        <section style={{ padding: "56px 0 40px" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>TWU Automations</div>
          <div className="hero-num">{totalAutomations}</div>
          <div style={{ color: "var(--ink-dim)", fontSize: 15, marginTop: 10 }}>
            {gymOwnerFlows.length} for gym owner outreach (Train With Us) · {memberFlows.length} for member outreach (Blended Athletics) · {platformFlows.length} platform
          </div>
        </section>

        {/* ============ SECTION: GYM OWNER OUTREACH ============ */}
        <section className="section" style={{ borderTop: "none", paddingTop: 0 }}>
          <div className="section-head">
            <div>
              <span className="chip" style={{ marginBottom: 10, display: "inline-flex" }}>Train With Us</span>
              <div className="section-title">Gym owner outreach</div>
            </div>
          </div>

          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <Head label="Contacts in CRM" path="lead_gen.total_contacts_in_ghl" data={data} />
            <Head label="Emails sent" path="lead_gen.email_outreach_sent" data={data} />
            <Head label="Replied" path="lead_gen.email_replied" data={data} amber />
            <Head label="IG DMs sent" path="lead_gen.ig_outreach_sent" data={data} />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Gym owner funnel</div>
            <Funnel
              rows={[
                { label: "Scraped", value: num(data, "summary.total_gyms_scraped"), tone: "cold" },
                { label: "Drafts created", value: num(data, "summary.total_drafts_created"), tone: "cold" },
                { label: "Emails sent", value: num(data, "lead_gen.email_outreach_sent"), tone: "warm" },
                { label: "Replied", value: num(data, "lead_gen.email_replied"), tone: "warm" },
                { label: "IG outreach sent", value: num(data, "lead_gen.ig_outreach_sent"), tone: "hot" },
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

          <div className="section-head" style={{ marginTop: 8 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>System health self-checks</div>
              <div className="section-title">Seven canaries, all should read near zero.</div>
            </div>
          </div>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            {CANARIES.map((c) => {
              const v = num(data, c.path);
              const bad = c.expect.includes("watch") ? (v ?? 0) > 0 : (v ?? 0) > 3;
              return (
                <div className="canary" key={c.path}>
                  <div>
                    <div className="c-val" style={{ color: bad ? "var(--amber)" : "var(--good)" }}>{fmt(v)}</div>
                    <div className="stat-label">{c.label}</div>
                  </div>
                  <div className="c-meta">
                    <span className={`dot ${bad ? "watch" : "good"}`} style={{ display: "inline-block" }} />
                    <div className="c-expect">{c.expect}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="eyebrow muted" style={{ marginBottom: 12 }}>{gymOwnerFlows.length} automations</div>
          <div className="grid grid-3">
            {gymOwnerFlows.map((f) => (
              <FlowCard key={f.slug} f={f} data={data} />
            ))}
          </div>
        </section>

        {/* ============ SECTION: MEMBER OUTREACH ============ */}
        <section className="section">
          <div className="section-head">
            <div>
              <span className="chip" style={{ marginBottom: 10, display: "inline-flex" }}>Blended Athletics</span>
              <div className="section-title">Member outreach</div>
            </div>
          </div>

          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <Head label="Members identified" path="app_adoption.total_identified" data={data} />
            <Head label="Outreach sent" path="app_adoption.email_outreach_confirmed" data={data} />
            <Head label="Adopted the app" path="app_adoption.total_joined" data={data} amber />
            <Head label="Adoption rate" path="app_adoption.adoption_rate_pct" data={data} suffix="%" />
          </div>

          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div className="eyebrow muted" style={{ marginBottom: 22 }}>Member funnel</div>
            <Funnel
              rows={[
                { label: "Identified", value: num(data, "app_adoption.total_identified"), tone: "cold" },
                { label: "Outreach sent", value: sum(data, ["app_adoption.email_outreach_confirmed", "app_adoption.followup_confirmed"]), tone: "warm" },
                { label: "Replied", value: num(data, "app_adoption.stage_replied"), tone: "warm" },
                { label: "Adopted app", value: num(data, "app_adoption.total_joined"), tone: "amber" },
              ]}
            />
          </div>

          <div className="eyebrow muted" style={{ marginBottom: 12 }}>{memberFlows.length} automations</div>
          <div className="grid grid-3">
            {memberFlows.map((f) => (
              <FlowCard key={f.slug} f={f} data={data} />
            ))}
          </div>
        </section>

        {/* ============ SECTION: PLATFORM ============ */}
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Platform</div>
              <div className="section-title">The dashboard itself.</div>
            </div>
          </div>
          <div className="grid grid-3">
            {platformFlows.map((f) => (
              <FlowCard key={f.slug} f={f} data={data} />
            ))}
          </div>
        </section>

        <div className="foot">
          TWU Automations Dashboard · data refreshes every 30 seconds from /twu-readout-data.
        </div>
      </div>
    </>
  );
}

function num(data: Readout | null, path: string): number | null {
  const v = pick(data, path);
  return typeof v === "number" ? v : v == null ? null : Number(v);
}

function sum(data: Readout | null, paths: string[]): number | null {
  const vals = paths.map((p) => num(data, p));
  if (vals.every((v) => v == null)) return null;
  return vals.reduce((a: number, b) => a + (b ?? 0), 0);
}

function Head({ label, path, data, amber, suffix }: { label: string; path: string; data: Readout | null; amber?: boolean; suffix?: string }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${amber ? "amber" : ""}`}>
        {fmt(pick(data, path))}
        {suffix && <span className="stat-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

function FlowCard({ f, data }: { f: Flow; data: Readout | null }) {
  const h = health(f);
  const headline = f.metrics[0];
  const headlineVal = headline ? num(data, headline.path) : null;
  return (
    <a className="card click flow-card" href={`/flows/${f.slug}`}>
      <div className="fc-top">
        <span className="fc-name">{f.name}</span>
        <span className={`dot ${h}`} />
      </div>
      <div className="fc-line">{f.oneLine}</div>
      {headline && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{fmt(headlineVal)}</span>
          <span className="stat-label">{headline.label}</span>
        </div>
      )}
      <div className="fc-foot">
        <span className="fc-date">Live {f.goLive.slice(5).replace("-", "/")}/{f.goLive.slice(0, 4)}</span>
      </div>
    </a>
  );
}
