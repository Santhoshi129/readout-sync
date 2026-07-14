import { notFound } from "next/navigation";
import { getReadout, pick, Readout } from "@/lib/readout";
import { flowBySlug, FLOWS, ChartSpec } from "@/lib/flows";
import { longDate } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { Lens } from "@/components/Lens";
import { Changelog } from "@/components/Changelog";
import { Ring, Funnel, Bars, StatTiles } from "@/components/Charts";

// Not force-dynamic anymore: that setting overrides fetch-level revalidation
// and forces a brand-new n8n execution on every single page load. Now the page
// revalidates on the same 30s cadence as the fetch in lib/readout.ts.
export const revalidate = 30;

export function generateStaticParams() {
  return FLOWS.map((f) => ({ slug: f.slug }));
}

function num(data: Readout | null, path: string): number | null {
  const v = pick(data, path);
  return typeof v === "number" ? v : v == null ? null : Number(v);
}

export default async function FlowPage({ params, searchParams }: { params: { slug: string }; searchParams: { from?: string } }) {
  const flow = flowBySlug(params.slug);
  if (!flow) notFound();
  const { data, error, fetchedAt } = await getReadout();
  const backHref = searchParams.from || "/";
  const backLabel = backHref === "/gym-owners" ? "Owner Outreach Intelligence" : backHref === "/members" ? "Member Adoption Pulse" : "All dashboards";

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={data?.meta?.generated_at || fetchedAt} />
      <div className="wrap">
        <div style={{ paddingTop: 28 }}>
          <a className="back" href={backHref}>← {backLabel}</a>
        </div>

        {/* HEADER */}
        <section style={{ padding: "28px 0 8px" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{flow.category}</div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{flow.name}</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 18, marginTop: 16, maxWidth: 720, lineHeight: 1.55 }}>{flow.oneLine}</p>
          <div style={{ marginTop: 18, display: "flex", gap: 14, alignItems: "center" }}>
            <span className="chip">◍ Live since {longDate(flow.goLive)}</span>
          </div>
        </section>

        {error && (
          <div className="banner err" style={{ marginTop: 20 }}>
            The Readout is unreachable ({error}). The analysis and changelog below are static; the report tiles fill in when it responds.
          </div>
        )}

        {/* 1 · ANALYSIS FIRST */}
        <section className="section">
          <Lens technical={flow.technical} business={flow.business} />
        </section>

        {/* 3 · REPORT */}
        {(flow.metrics.length > 0 || flow.charts.length > 0) ? (
          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Report: live impact</div>
                <div className="section-title">What it&apos;s producing.</div>
              </div>
            </div>

            {flow.metrics.length > 0 && (
              <div style={{ marginBottom: flow.charts.length ? 28 : 0 }}>
                <StatTiles
                  tiles={flow.metrics.map((m) => ({
                    label: m.label,
                    value: num(data, m.path),
                    note: m.note,
                    suffix: m.suffix,
                    flag: m.flag,
                    tone: m.flag === "canary" ? "bad" : m.flag === "cached" ? "muted" : "amber",
                  }))}
                />
              </div>
            )}

            {flow.charts.map((c, i) => (
              <div className="card" style={{ padding: 28, marginBottom: 16 }} key={i}>
                <div className="eyebrow muted" style={{ marginBottom: 22 }}>{c.title}</div>
                <Chart c={c} data={data} />
              </div>
            ))}
          </section>
        ) : (
          <section className="section">
            <div className="banner">
              This flow isn&apos;t instrumented in The Readout yet, so it has no live tiles - see the changelog for why. Flagged, not faked.
            </div>
          </section>
        )}

        {/* 4 · SYSTEM UPDATES */}
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>System updates</div>
              <div className="section-title">Changelog.</div>
            </div>
          </div>
          <div className="card" style={{ padding: "6px 24px" }}>
            <Changelog entries={flow.changelog} />
          </div>
        </section>

        {/* 5 · TAG NOTES */}
        {flow.tagNotes && flow.tagNotes.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Tags it applies</div>
                <div className="section-title">Why each tag exists.</div>
              </div>
            </div>
            <div className="grid grid-2">
              {flow.tagNotes.map((t) => (
                <div className="card" key={t.tag}>
                  <span className="chip" style={{ marginBottom: 12 }}>{t.tag}</span>
                  <p style={{ color: "var(--ink-dim)", fontSize: 14.5, lineHeight: 1.6, marginTop: 6 }}>{t.why}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="foot">Every number above is live via the Readout cache sync · {flow.name}</div>
      </div>
    </>
  );
}

function Chart({ c, data }: { c: ChartSpec; data: Readout | null }) {
  if (c.kind === "ring") {
    return <Ring value={num(data, c.valuePath!)} total={num(data, c.totalPath!)} centerLabel={c.centerLabel} />;
  }
  const rows = (c.series || []).map((s) => ({ label: s.label, value: num(data, s.path), tone: s.tone }));
  if (c.kind === "funnel") return <Funnel rows={rows} />;
  return <Bars rows={rows} />;
}
