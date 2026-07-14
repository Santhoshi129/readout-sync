import { Topbar } from "@/components/Topbar";
import { Donut, StatTiles, Bars } from "@/components/Charts";
import { ParetoChart } from "@/components/ParetoChart";
import { QuickWinsMatrix } from "@/components/QuickWinsMatrix";
import { ConnectionMap } from "@/components/ConnectionMap";
import { EvidenceTable } from "@/components/EvidenceTable";
import { getRetentionMatrix, label, ACTIONABLE_TEXT } from "@/lib/retention-matrix";
import { longDate } from "@/lib/format";

export const revalidate = 3600;

export default function RetentionResearch() {
  const fetchedAt = new Date().toISOString();
  const report = getRetentionMatrix();
  const rows = report.matrix;
  const top = rows[0];

  const totalMember = rows.reduce((s, r) => s + r.member_mentions, 0);
  const totalOwner = rows.reduce((s, r) => s + r.owner_mentions, 0);
  const memberShare = totalMember + totalOwner > 0 ? Math.round((totalMember / (totalMember + totalOwner)) * 100) : 0;

  const quadrantPoints = rows.flatMap((pp) =>
    pp.solutions
      .filter((s) => s.effectiveness != null && s.difficulty != null)
      .map((s) => ({
        solution: s.solution,
        parentPainPoint: pp.pain_point,
        effectiveness: s.effectiveness as number,
        difficulty: s.difficulty as number,
        frequency: s.frequency,
      }))
  );

  // Plain-language executive summary - the "read this in 30 seconds" layer.
  const totalMentions = rows.reduce((s, r) => s + r.frequency, 0);
  let running = 0;
  let eightyCount = rows.length;
  for (let i = 0; i < rows.length; i++) {
    running += rows[i].frequency;
    if (totalMentions > 0 && running / totalMentions >= 0.8) { eightyCount = i + 1; break; }
  }
  const bestQuickWin = quadrantPoints
    .filter((p) => p.effectiveness >= 4 && p.difficulty <= 2)
    .sort((a, b) => b.frequency - a.frequency)[0];
  const voiceLean = memberShare >= 65 ? "members themselves, not filtered through owner perspective"
    : memberShare <= 35 ? "gym owners describing what they're seeing, more than members speaking directly"
    : "a fairly even mix of member and owner voices";

  const actionableMentions = { yes: 0, partial: 0, no: 0 };
  rows.forEach((r) => { actionableMentions[r.twu_actionable] += r.frequency; });
  const fixablePct = totalMentions > 0 ? Math.round((actionableMentions.yes / totalMentions) * 100) : 0;

  return (
    <>
      <Topbar version="Community Research v1" fetchedAt={fetchedAt} crossLinkHref="/" crossLinkLabel="All systems" />
      <div className="wrap">
        <section style={{ padding: "48px 0 28px" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Community Research · r/CrossFit · r/HYROX · r/GymOwners</div>
          <div className="hero-sub">
            {label(top.pain_point)} is where members are quietly walking out the door.
          </div>
          <p className="hero-copy">
            Across {report.total_classified_items} retention-relevant discussions, {label(top.pain_point).toLowerCase()} was cited
            more than any other reason members disengage — {top.frequency} mentions, {top.member_mentions} of them from members directly.
            <strong style={{ color: "var(--ink)" }}> This particular one isn't fixable with a feature</strong> — it's a culture problem, not a software problem.
          </p>
        </section>

        <div className="card" style={{ padding: 24, marginBottom: 28, borderLeft: "3px solid var(--amber)" }}>
          <div className="stat-label" style={{ marginBottom: 12 }}>In plain terms</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.6 }}>
            <li>
              Fixing just <strong style={{ color: "var(--ink)" }}>{eightyCount} of {rows.length} pain points</strong> would address roughly <strong style={{ color: "var(--ink)" }}>80% of everything</strong> members and owners are saying — a short list, not 13 equal problems.
            </li>
            <li>
              Only <strong style={{ color: "var(--ink)" }}>{fixablePct}% of all mentions</strong> point to something the app can directly fix. The rest is staffing, culture, or business decisions — worth knowing before scoping a sprint around this data.
            </li>
            <li>
              This data leans toward <strong style={{ color: "var(--ink)" }}>{voiceLean}</strong> ({memberShare}% member-voiced).
            </li>
            {bestQuickWin && (
              <li>
                Clearest immediate move: <strong style={{ color: "var(--ink)" }}>{bestQuickWin.solution}</strong>, addressing {label(bestQuickWin.parentPainPoint).toLowerCase()} — reported as working well and cheap to put in place.
              </li>
            )}
          </ul>
        </div>

        <div style={{ marginBottom: 28 }}>
          <StatTiles
            tiles={[
              { label: "Discussions analyzed", value: report.total_classified_items, note: `Across r/${report.subreddits.join(", r/")}. Early pilot — not yet enough volume to bet a roadmap on.` },
              { label: "Pain point categories", value: rows.length, note: "Fixed taxonomy — every item mapped to one of these, not free text." },
              { label: "App-fixable mentions", value: fixablePct, suffix: "%", note: "Share of all mentions pointing to something the product can directly address." },
              { label: "Member-voiced share", value: memberShare, suffix: "%", note: `${totalMember} member mentions vs ${totalOwner} owner mentions.` },
            ]}
          />
        </div>

        {/* Dashboard grid - four panels visible together, not four separate
            scroll stops. This is the actual "dashboard" surface; the
            evidence table below is the deliberate exception since a
            sortable table needs room to breathe. */}
        <div className="grid grid-2" style={{ gap: 20, marginBottom: 20 }}>
          <div className="card" style={{ padding: 26 }}>
            <div className="section-head">
              <div className="section-title">Where the problem concentrates</div>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>80/20 view</span>
            </div>
            <ParetoChart rows={rows} />
          </div>

          <div className="card" style={{ padding: 26 }}>
            <div className="section-head">
              <div className="section-title">Quick wins map</div>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>cheap &amp; working →</span>
            </div>
            <QuickWinsMatrix points={quadrantPoints} />
          </div>

          <div className="card" style={{ padding: 26 }}>
            <div className="section-head">
              <div className="section-title">Pain point → solution map</div>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>colored by app-fixability</span>
            </div>
            <ConnectionMap rows={rows} />
          </div>

          <div className="card" style={{ padding: 26 }}>
            <div className="section-head">
              <div className="section-title">Who's talking, what's fixable</div>
            </div>
            <Donut
              segments={[
                { label: "Members", value: totalMember, tone: "cold" },
                { label: "Owners", value: totalOwner, tone: "amber" },
              ]}
              centerLabel="mentions"
              compact
            />
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
              <div className="stat-label" style={{ marginBottom: 12 }}>Mentions by fixability</div>
              <Bars
                rows={[
                  { label: ACTIONABLE_TEXT.yes, value: actionableMentions.yes, tone: "hot" },
                  { label: ACTIONABLE_TEXT.partial, value: actionableMentions.partial, tone: "amber" },
                  { label: ACTIONABLE_TEXT.no, value: actionableMentions.no, tone: "bad" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="section-title">Evidence table</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Every pain point × solution, sortable, searchable, filterable by fixability.</div>
          </div>
          <div className="card" style={{ padding: 26 }}>
            <EvidenceTable rows={rows} />
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-soft)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.7 }}>
          Methodology: r/CrossFit, r/HYROX, r/GymOwners → keyword pre-filter → classified against a fixed 14-category taxonomy →
          scored for relevance, perspective, and (where a fix is named) effectiveness/difficulty on a 1–5 scale. First pass,
          generated {longDate(report.generated_at)}. Independent from Retention Signal.
        </div>
      </div>
    </>
  );
}
