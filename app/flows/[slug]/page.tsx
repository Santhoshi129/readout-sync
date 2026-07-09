import { notFound } from "next/navigation";
import { getReadout, pick, Readout } from "@/lib/readout";
import { flowBySlug, FLOWS, Metric, ChartSpec } from "@/lib/flows";
import { fmt, longDate } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { Lens } from "@/components/Lens";
import { Changelog } from "@/components/Changelog";
import { Ring, Funnel, Bars } from "@/components/Charts";

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
  const backLabel = backHref === "/gym-owners" ? "Gym owner outreach" : backHref === "/members" ? "Member outreach" : "All dashboards";

  return (
    <>
      <Topbar version={data?.meta?.version} fetchedAt={fetchedAt} />
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
              <div className="grid grid-4" style={{ marginBottom: flow.charts.length ? 28 : 0 }}>
                {flow.metrics.map((m) => (
                  <MetricCard key={m.path + m.label} m={m} data={data} />
                ))}
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

        {/* 4 · HEALTH CANARIES */}
        {flow.canaries && flow.canaries.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Health checks</div>
                <div className="section-title">Self-checks for this flow.</div>
              </div>
            </div>
            <div className="grid grid-3">
              {flow.canaries.map((c) => {
                const v = num(data, c.path);
                const watch = c.expect.includes("watch") || c.expect.includes("migrate");
                const bad = watch ? (v ?? 0) > 0 : (v ?? 0) > 3;
                return (
                  <div className="canary" key={c.path}>
                    <div>
                      <div className="c-val" style={{ color: bad ? "var(--amber)" : "var(--good)" }}>{fmt(v)}</div>
                      <div className="stat-label">{c.label}</div>
                    </div>
                    <div className="c-meta">
                      <span className={`dot ${bad ? "watch" : "good"}`} />
                      <div className="c-expect">{c.expect}</div>
                    </div>
                  </div>
                );
              })}
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

        <div className="foot">Every number above is fetched live from /twu-readout-data · {flow.name}</div>
      </div>
    </>
  );
}

function MetricCard({ m, data }: { m: Metric; data: Readout | null }) {
  const raw = pick(data, m.path);
  const val = m.suffix === "%" ? (raw == null ? "-" : `${raw}`) : fmt(raw);
  return (
    <div className="card">
      <div className="stat-label">{m.label}</div>
      <div className="stat-value" style={{ fontSize: 32 }}>
        {val}
        {m.suffix && raw != null && <span className="stat-suffix">{m.suffix}</span>}
      </div>
      {m.flag && m.flag !== "live" && (
        <span className={`chip ${m.flag}`} style={{ marginTop: 10 }}>
          {m.flag === "cached" ? "cached" : m.flag === "not-instrumented" ? "not instrumented" : "canary"}
        </span>
      )}
      {m.note && <p style={{ color: "var(--ink-faint)", fontSize: 11.5, lineHeight: 1.5, marginTop: 10 }}>{m.note}</p>}
    </div>
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
