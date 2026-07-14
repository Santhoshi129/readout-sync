import { Topbar } from "@/components/Topbar";
import { Donut, StatTiles } from "@/components/Charts";
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
