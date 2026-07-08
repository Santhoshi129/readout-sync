import { getReadout, pick, Readout } from "@/lib/readout";
import { FLOWS, Flow } from "@/lib/flows";
import { fmt } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { Funnel } from "@/components/Charts";

export const dynamic = "force-dynamic";

function health(f: Flow): "good" | "watch" | "gap" {
  if (f.changelog.some((c) => c.status === "gap")) return "gap";
  if (f.changelog.some((c) => c.status === "monitoring" || c.status === "in-progress")) return "watch";
  return "good";
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

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={fetchedAt} />
      <div className="wrap">
        {error && (
          <div className="banner err" style={{ marginTop: 28 }}>
            The Readout is unreachable right now ({error}). Metrics will populate as soon as it responds — nothing here is cached or faked.
          </div>
        )}

        {/* HERO */}
        <section className="hero">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Gyms reached, on purpose</div>
          <div className="hero-num">{fmt(pick(data, "summary.total_gyms_scraped"))}</div>
          <div className="hero-sub">From cold list to community, every step on the record.</div>
          <p className="hero-copy">
            One system takes thousands of cold gyms and works them, in David&apos;s voice, all the way to the community — scored, drafted, sent, followed up, and tracked. This is what it&apos;s doing right now.
          </p>
        </section>

        {/* HEADLINE STATS */}
        <section className="section" style={{ borderTop: "none", paddingTop: 0 }}>
          <div className="grid grid-4">
            <Head label="Conversations started" path="lead_gen.stage_responded" data={data} />
            <Head label="In the community" path="app_adoption.total_joined" data={data} amber />
            <Head label="Emails shipped" path="summary.total_emails_sent" data={data} />
            <Head label="Contacts in CRM" path="lead_gen.total_contacts_in_ghl" data={data} />
          </div>
        </section>

        {/* GLOBAL FUNNEL */}
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>The system, cold to community</div>
              <div className="section-title">Nothing is invisible.</div>
            </div>
          </div>
          <div className="card" style={{ padding: 32 }}>
            <Funnel
              rows={[
                { label: "Scraped", value: num(data, "summary.total_gyms_scraped"), tone: "cold" },
                { label: "Drafts created", value: num(data, "summary.total_drafts_created"), tone: "cold" },
                { label: "Emails sent", value: num(data, "summary.total_emails_sent"), tone: "warm" },
                { label: "Replied", value: num(data, "summary.total_email_replied"), tone: "warm" },
                { label: "IG outreach", value: num(data, "summary.ig_dms_sent"), tone: "hot" },
                { label: "Joined community", value: num(data, "app_adoption.total_joined"), tone: "amber" },
              ]}
            />
            <p style={{ color: "var(--ink-faint)", fontSize: 12.5, marginTop: 22, lineHeight: 1.6 }}>
              Live from The Readout summary. The old &quot;Dave Approved&quot; step was retired in v8.1 (tag-hygiene drift) and isn&apos;t shown as a separate stage — these are the stages that are actually instrumented.
            </p>
          </div>
        </section>

        {/* SYSTEM HEALTH */}
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>System health self-checks</div>
              <div className="section-title">Seven canaries, all should read near zero.</div>
            </div>
          </div>
          <div className="grid grid-4">
            {CANARIES.map((c) => {
              const v = num(data, c.path);
              const bad = c.expect.includes("watch")
                ? (v ?? 0) > 0
                : (v ?? 0) > 3;
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
        </section>

        {/* FLOW GRID */}
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>The flows, click any to drill in</div>
              <div className="section-title">Fifteen automations, one pipeline.</div>
            </div>
          </div>
          <div className="grid grid-3">
            {[...FLOWS].sort((a, b) => a.order - b.order).map((f) => {
              const h = health(f);
              return (
                <a className="card click flow-card" href={`/flows/${f.slug}`} key={f.slug}>
                  <div className="fc-top">
                    <span className="fc-name">{f.name}</span>
                    <span className={`dot ${h}`} />
                  </div>
                  <div className="fc-line">{f.oneLine}</div>
                  <div className="fc-foot">
                    <span className="fc-date">Live {f.goLive.slice(5).replace("-", "/")}/{f.goLive.slice(0, 4)}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <div className="foot">
          TWU · The Readout: from cold to community. Every metric fetched live from /twu-readout-data.
        </div>
      </div>
    </>
  );
}

function num(data: Readout | null, path: string): number | null {
  const v = pick(data, path);
  return typeof v === "number" ? v : v == null ? null : Number(v);
}

function Head({ label, path, data, amber }: { label: string; path: string; data: Readout | null; amber?: boolean }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${amber ? "amber" : ""}`}>{fmt(pick(data, path))}</div>
    </div>
  );
}
