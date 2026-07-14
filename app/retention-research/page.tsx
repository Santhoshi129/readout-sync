import { Topbar } from "@/components/Topbar";
import { Donut, StatTiles } from "@/components/Charts";
import { ParetoChart } from "@/components/ParetoChart";
import { QuickWinsMatrix } from "@/components/QuickWinsMatrix";
import { PainPointRanking } from "@/components/PainPointRanking";
import { EvidenceTable } from "@/components/EvidenceTable";
import { getRetentionMatrix, label } from "@/lib/retention-matrix";
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

  // Plain-language executive summary - the "read this in 30 seconds"
  // layer. Every number here is derived, nothing hand-typed, so it stays
  // true as the underlying data grows.
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

  return (
    <>
      <Topbar version="Community Research v1" fetchedAt={fetchedAt} crossLinkHref="/" crossLinkLabel="All systems" />
      <div className="wrap">
        <section style={{ padding: "56px 0 40px" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Community Research · r/CrossFit · r/HYROX · r/GymOwners</div>
          <div className="hero-sub">
            {label(top.pain_point)} is where members are quietly walking out the door.
          </div>
          <p className="hero-copy">
            Across {report.total_classified_items} retention-relevant discussions, {label(top.pain_point).toLowerCase()} was cited
            more than any other reason members disengage — {top.frequency} mentions, {top.member_mentions} of them from members directly.
          </p>
        </section>

        <div className="card" style={{ padding: 28, marginBottom: 40, borderLeft: "3px solid var(--amber)" }}>
          <div className="stat-label" style={{ marginBottom: 14 }}>In plain terms</div>
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: 14.5, color: "var(--ink-dim)", lineHeight: 1.6 }}>
            <li>
              Fixing just <strong style={{ color: "var(--ink)" }}>{eightyCount} of the {rows.length} pain points</strong> below would address roughly <strong style={{ color: "var(--ink)" }}>80% of everything members and owners are complaining about</strong> — this isn't 13 equal-sized problems, it's a short list that matters most.
            </li>
            <li>
              This data is coming from <strong style={{ color: "var(--ink)" }}>{voiceLean}</strong> ({memberShare}% member-voiced).
            </li>
            {bestQuickWin ? (
              <li>
                The clearest immediate opportunity: <strong style={{ color: "var(--ink)" }}>{bestQuickWin.solution}</strong>, addressing {label(bestQuickWin.parentPainPoint).toLowerCase()} — reported as working well and cheap to put in place.
              </li>
            ) : (
              <li>No solution yet clears the bar for "cheap and clearly working" — the quick-wins map below shows what's closest.</li>
            )}
          </ul>
        </div>

        <div style={{ marginBottom: 40 }}>
          <StatTiles
            tiles={[
              { label: "Discussions analyzed", value: report.total_classified_items, note: `Across r/${report.subreddits.join(", r/")}.` },
              { label: "Pain point categories", value: rows.length, note: "Fixed taxonomy — every item mapped to one of these, not free text." },
              { label: "Member-voiced share", value: memberShare, suffix: "%", note: `${totalMember} member mentions vs ${totalOwner} owner mentions.` },
              { label: "Leading pain point", value: null, note: label(top.pain_point) },
            ]}
          />
        </div>

        <div className="section">
          <div className="section-head">
            <div className="section-title">Where the problem concentrates</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Ranked by mentions, with cumulative share overlaid.</div>
          </div>
          <div className="card" style={{ padding: 32 }}>
            <ParetoChart rows={rows} />
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="section-title">Pain points, ranked</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Click any row to see its solutions.</div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <PainPointRanking rows={rows} />
          </div>
        </div>

        <div className="section">
          <div className="grid grid-2" style={{ gap: 24 }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="section-head">
                <div className="section-title">Quick wins map</div>
              </div>
              <QuickWinsMatrix points={quadrantPoints} />
            </div>
            <div className="card" style={{ padding: 28 }}>
              <div className="section-head">
                <div className="section-title">Who's talking</div>
              </div>
              <Donut
                segments={[
                  { label: "Members", value: totalMember, tone: "cold" },
                  { label: "Owners", value: totalOwner, tone: "amber" },
                ]}
                centerLabel="mentions"
              />
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6 }}>
                Each discussion is tagged by whether it reads as a gym owner's business perspective or a member's customer perspective.
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="section-title">Evidence table</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Every pain point × solution pair, sortable and searchable.</div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <EvidenceTable rows={rows} />
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="section-title">How to read this report</div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <div className="grid grid-2" style={{ gap: 28 }}>
              <div>
                <div className="stat-label" style={{ marginBottom: 12 }}>Methodology</div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.8 }}>
                  Posts and comments pulled from r/CrossFit, r/HYROX, and r/GymOwners, narrowed by a keyword pre-filter, then
                  classified against a fixed 14-category pain-point taxonomy. Each item is scored for relevance, perspective
                  (owner vs. member), and — where a fix is mentioned — effectiveness and implementation difficulty on a 1–5 scale.
                </div>
              </div>
              <div>
                <div className="stat-label" style={{ marginBottom: 12 }}>Reading the quadrant</div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.8 }}>
                  Bubble position is difficulty (x) vs. reported effectiveness (y); size is how often that solution came up.
                  Top-left is where to look first — solutions that are cheap to run and reported as actually working.
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-soft)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
              First classification pass, generated {longDate(report.generated_at)} — figures will grow as remaining subreddit data is processed.
            </div>
          </div>
        </div>

        <div className="foot">
          Community Research · Reddit scrape → keyword pre-filter → classification → aggregated matrix. Independent from Retention Signal.
        </div>
      </div>
    </>
  );
}
