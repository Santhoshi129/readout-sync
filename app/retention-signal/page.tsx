import { getRetentionFindings, getLatestRunSummary } from "@/lib/retention";
import { Topbar } from "@/components/Topbar";
import { Bars, Donut, StatTiles } from "@/components/Charts";
import { PriorityMatrix, FindingCard } from "@/components/RetentionCharts";
import { RetentionBriefing } from "@/components/RetentionBriefing";
import { fmt } from "@/lib/format";

export const revalidate = 30;

const CATEGORY_TONE: Record<string, string> = {
  acquisition: "cold", engagement: "amber", onboarding: "hot",
  pricing_value: "warm", communication: "muted", software_tooling: "bad", life_event: "cold",
};

export default async function RetentionSignal() {
  const fetchedAt = new Date().toISOString();
  const [{ findings, error: fErr }, { summary, error: sErr }] = await Promise.all([
    getRetentionFindings(),
    getLatestRunSummary(),
  ]);

  const hasFindings = findings.length > 0;

  const categoryTotals: Record<string, number> = {};
  findings.forEach((f) => {
    const c = f.pain_point_category || "other";
    categoryTotals[c] = (categoryTotals[c] || 0) + f.frequency;
  });
  const categoryRows = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label: label.replace("_", " / ").replace(/\b\w/g, (m) => m.toUpperCase()),
      value,
      tone: CATEGORY_TONE[label] || "amber",
    }));

  const bandCounts = { Strong: 0, Moderate: 0, Emerging: 0 };
  findings.forEach((f) => {
    const band = (f.confidence_band || "").split(" ")[0];
    if (band in bandCounts) bandCounts[band as keyof typeof bandCounts]++;
  });

  return (
    <>
      <Topbar version="Retention v1" fetchedAt={fetchedAt} crossLinkHref="/" crossLinkLabel="All systems" />
      <div className="wrap">
        {(fErr || sErr) && (
          <div className="banner err" style={{ marginTop: 28 }}>
            Retention Signal's live data isn't reachable right now ({fErr || sErr}). This will fill in as soon as the connection is back.
          </div>
        )}

        <section style={{ padding: "56px 0 40px" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Gym Owner Retention Research</div>
          <div className="hero-sub">What gym owners actually say before they lose a member.</div>
          <p className="hero-copy">
            Every finding below traces back to a real Reddit thread — scraped, classified, and scored by Claude, then checked against published fitness-industry data.
          </p>
        </section>

        {summary && <RetentionBriefing summary={summary} findings={findings} />}

        <div style={{ marginTop: 8, marginBottom: 40 }}>
          <StatTiles
            tiles={[
              { label: "Items scraped", value: summary?.total_items_scraped ?? null },
              { label: "Findings extracted", value: summary?.total_findings_extracted ?? null },
              { label: "Industry-validated", value: summary?.findings_industry_validated ?? null },
              { label: "Strong confidence", value: summary?.findings_strong_confidence ?? null },
            ]}
          />
        </div>

        {!hasFindings ? (
          <div className="banner">
            No findings have cleared the scoring threshold yet ({fmt(summary?.total_items_scraped ?? 0)} items scraped so far). Expected at low sample sizes — this fills in as the scrape runs against the full subreddit × keyword matrix.
          </div>
        ) : (
          <>
            <div className="section">
              <div className="section-head"><div className="section-title">Priority matrix</div></div>
              <div className="card" style={{ padding: 32 }}>
                <PriorityMatrix findings={findings} />
              </div>
            </div>

            <div className="section">
              <div className="grid grid-2" style={{ gap: 24 }}>
                <div className="card" style={{ padding: 28 }}>
                  <div className="stat-label" style={{ marginBottom: 20 }}>Mentions by category</div>
                  <Bars rows={categoryRows} />
                </div>
                <div className="card" style={{ padding: 28 }}>
                  <div className="stat-label" style={{ marginBottom: 20 }}>Confidence distribution</div>
                  <Donut
                    segments={[
                      { label: "Strong", value: bandCounts.Strong, tone: "hot" },
                      { label: "Moderate", value: bandCounts.Moderate, tone: "amber" },
                      { label: "Emerging", value: bandCounts.Emerging, tone: "muted" },
                    ]}
                    centerLabel="findings"
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-head">
                <div className="section-title">Evidence ledger</div>
                <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Ranked by community confidence score.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {findings.map((f, i) => <FindingCard key={f.finding_key} rank={i + 1} finding={f} />)}
              </div>
            </div>
          </>
        )}

        <div className="foot">
          Retention Signal · Apify Reddit scrape → Claude classification → confidence scoring → industry benchmark → MongoDB. Every finding traceable to its original source.
        </div>
      </div>
    </>
  );
}
