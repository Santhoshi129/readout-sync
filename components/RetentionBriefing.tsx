import { fmt } from "@/lib/format";
import { RetentionFinding, RetentionRunSummary } from "@/lib/retention";

export function RetentionBriefing({ summary, findings }: { summary: RetentionRunSummary; findings: RetentionFinding[] }) {
  const top = findings[0];
  const validatedCount = findings.filter((f) => f.industry_validated === true).length;

  return (
    <div className="briefing">
      <div className="eyebrow" style={{ marginBottom: 10 }}>Retention research briefing</div>
      <p className="briefing-lead">
        {findings.length === 0 ? (
          <>The latest scrape covered <strong>{fmt(summary.total_items_scraped)}</strong> Reddit posts and comments and surfaced no findings that cleared the scoring threshold yet.</>
        ) : (
          <>Across <strong>{fmt(summary.total_items_scraped)}</strong> Reddit posts and comments, <strong>{fmt(findings.length)}</strong> retention pain points cleared the scoring bar — <strong>{fmt(validatedCount)}</strong> confirmed by published industry data. The strongest signal: <strong>{top.pain_point}</strong>.</>
        )}
      </p>
      <p className="briefing-sub">
        Every number here is read live from MongoDB — nothing on this page is hand-typed. Findings are ranked by a confidence score combining how often something was mentioned, how credible the source was, how recent it is, and how specific the detail was.
      </p>
    </div>
  );
}
