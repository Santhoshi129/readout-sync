import { getRetentionFindings, getLatestRunSummary, getRunHistory } from "@/lib/retention";
import { Topbar } from "@/components/Topbar";
import { Bars, Donut, StatTiles, Trend } from "@/components/Charts";
import { PriorityMatrix } from "@/components/RetentionCharts";
import { RetentionLedger } from "@/components/RetentionLedger";
import { RetentionBriefing } from "@/components/RetentionBriefing";
import { fmt } from "@/lib/format";

export const revalidate = 30;

const CATEGORY_TONE: Record<string, string> = {
  acquisition: "cold", engagement: "amber", onboarding: "hot", retention_general: "amber",
  pricing_value: "warm", communication: "muted", software_tooling: "bad", life_event: "cold",
  staffing_coaching: "warm",
};

const CHURN_TONE: Record<string, string> = {
  onboarding: "hot", engagement: "amber", value: "warm", life_event: "cold", unclear: "muted",
};

const SEGMENT_TONE: Record<string, string> = {
  crossfit: "amber", hyrox: "cold", independent: "warm", franchise_other: "muted", unclear: "muted",
};

function pretty(label: string) {
  return label.replace(/_/g, " / ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function RetentionSignal() {
  const fetchedAt = new Date().toISOString();
  const [{ findings, error: fErr }, { summary, error: sErr }, runs] = await Promise.all([
    getRetentionFindings(),
    getLatestRunSummary(),
    getRunHistory(),
  ]);

  const hasFindings = findings.length > 0;

  // ---- Server-side aggregates (all derived, nothing hand-typed) ----

  const categoryTotals: Record<string, number> = {};
  const churnTotals: Record<string, number> = {};
  const segmentTotals: Record<string, number> = {};
  const solutionTotals: Record<string, number> = {};
  const featureGaps: { gap: string; pain_point: string }[] = [];
  let contradictions = 0;
  let disguisedPitches = 0;
  let specificityWeighted = 0;
  let mentionsTotal = 0;

  findings.forEach((f) => {
    const c = f.pain_point_category || "other";
    categoryTotals[c] = (categoryTotals[c] || 0) + f.frequency;
    const cb = f.churn_bucket || "unclear";
    churnTotals[cb] = (churnTotals[cb] || 0) + f.frequency;
    const seg = f.affiliate_segment || "unclear";
    segmentTotals[seg] = (segmentTotals[seg] || 0) + f.frequency;
    (f.solutions_by_frequency || []).forEach((s) => {
      solutionTotals[s.solution] = (solutionTotals[s.solution] || 0) + s.mentioned;
    });
    (f.feature_gaps_mentioned || []).forEach((g) => featureGaps.push({ gap: g, pain_point: f.pain_point }));
    if (f.contradiction_flag) contradictions++;
    disguisedPitches += f.disguised_pitch_count || 0;
    specificityWeighted += (f.avg_specificity || 0) * f.frequency;
    mentionsTotal += f.frequency;
  });

  const avgSpecificity = mentionsTotal > 0 ? Math.round((specificityWeighted / mentionsTotal) * 10) / 10 : null;

  const categoryRows = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: pretty(label), value, tone: CATEGORY_TONE[label] || "amber" }));

  const churnSegments = Object.entries(churnTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: pretty(label), value, tone: CHURN_TONE[label] || "amber" }));

  const segmentRows = Object.entries(segmentTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: pretty(label), value, tone: SEGMENT_TONE[label] || "amber" }));

  const solutionRows = Object.entries(solutionTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, tone: "amber" }));

  const bandCounts = { Strong: 0, Moderate: 0, Emerging: 0 };
  findings.forEach((f) => {
    const band = (f.confidence_band || "").split(" ")[0];
    if (band in bandCounts) bandCounts[band as keyof typeof bandCounts]++;
  });

  const validated = findings.filter((f) => f.industry_validated === true).length;
  const notConfirmed = findings.filter((f) => f.industry_validated === false).length;
  const pendingBenchmark = findings.length - validated - notConfirmed;

  const trendPoints = runs.map((r) => ({
    ts: r.run_timestamp,
    metrics: {
      items: r.total_items_scraped ?? 0,
      findings: r.total_findings_extracted ?? 0,
      validated: r.findings_industry_validated ?? 0,
    },
  }));

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
              { label: "Items scraped", value: summary?.total_items_scraped ?? null, note: `${fmt(summary?.total_posts_scraped ?? 0)} posts + ${fmt(summary?.total_comments_scraped ?? 0)} comments in the latest run.` },
              { label: "Findings extracted", value: summary?.total_findings_extracted ?? null, note: "Distinct pain-point groups that cleared the scoring threshold." },
              { label: "Industry-validated", value: summary?.findings_industry_validated ?? null, tone: "hot", note: "Confirmed against published fitness-industry data (IHRSA and similar)." },
              { label: "Strong confidence", value: summary?.findings_strong_confidence ?? null, tone: "hot", note: "8+ mentions, majority credible owners, high specificity." },
              { label: "Subreddits scanned", value: summary?.subreddits_scanned?.length ?? null, note: (summary?.subreddits_scanned || []).map((s) => `r/${s}`).join(", ") },
              { label: "Keywords tracked", value: summary?.keywords_searched?.length ?? null, note: (summary?.keywords_searched || []).join(" · ") },
              { label: "Avg specificity", value: avgSpecificity, suffix: "/3", note: "Mention-weighted. 1 = generic advice, 3 = concrete numbers and mechanisms." },
              { label: "Split-report flags", value: hasFindings ? contradictions : null, tone: contradictions > 0 ? "warm" : undefined, note: "Findings where owners meaningfully disagree on whether the fix worked." },
              { label: "Vendor pitches filtered", value: hasFindings ? disguisedPitches : null, tone: "muted", note: "Posts classified as sales pitches disguised as advice — excluded from every score." },
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
              <div className="section-head">
                <div className="section-title">Priority matrix</div>
                <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Where mention volume meets reported effectiveness.</div>
              </div>
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
              <div className="grid grid-2" style={{ gap: 24 }}>
                <div className="card" style={{ padding: 28 }}>
                  <div className="stat-label" style={{ marginBottom: 20 }}>Where members are lost</div>
                  <Donut segments={churnSegments} centerLabel="mentions" />
                  <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6 }}>
                    Each mention is bucketed into the churn stage the owner described — onboarding drop-off, engagement fade, perceived value, or a life event outside the gym's control.
                  </div>
                </div>
                <div className="card" style={{ padding: 28 }}>
                  <div className="stat-label" style={{ marginBottom: 20 }}>Benchmark verdicts</div>
                  <Donut
                    segments={[
                      { label: "Industry-validated", value: validated, tone: "hot" },
                      { label: "Not confirmed", value: notConfirmed, tone: "bad" },
                      { label: "Pending benchmark", value: pendingBenchmark, tone: "muted" },
                    ]}
                    centerLabel="findings"
                  />
                  <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6 }}>
                    Top-scoring findings are stress-tested against published industry data — including an active search for disconfirming evidence, not just support.
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="grid grid-2" style={{ gap: 24 }}>
                <div className="card" style={{ padding: 28 }}>
                  <div className="stat-label" style={{ marginBottom: 20 }}>Mentions by gym segment</div>
                  <Bars rows={segmentRows} />
                </div>
                <div className="card" style={{ padding: 28 }}>
                  <div className="stat-label" style={{ marginBottom: 20 }}>Most-mentioned solutions</div>
                  {solutionRows.length > 0 ? (
                    <Bars rows={solutionRows} />
                  ) : (
                    <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>No concrete solutions surfaced yet — owners are describing the pain, not fixes.</div>
                  )}
                </div>
              </div>
            </div>

            {featureGaps.length > 0 && (
              <div className="section">
                <div className="section-head">
                  <div className="section-title">Software gaps owners named</div>
                  <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Organic mentions of gym-management software failing them — the TWU build list.</div>
                </div>
                <div className="grid grid-2" style={{ gap: 16 }}>
                  {featureGaps.map((g, i) => (
                    <div key={i} className="card" style={{ padding: "18px 22px", borderLeft: "2px solid var(--bad)" }}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>⚙ {g.gap}</div>
                      <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        surfaced under: {g.pain_point}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section">
              <div className="section-head">
                <div className="section-title">Evidence ledger</div>
                <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>Search, filter, and expand any finding down to its Reddit source.</div>
              </div>
              <RetentionLedger findings={findings} />
            </div>
          </>
        )}

        <div className="section">
          <div className="section-head">
            <div className="section-title">Run-over-run</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13.5 }}>One point per pipeline run, straight from retention_run_summary.</div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <Trend
              points={trendPoints}
              series={[
                { key: "items", label: "Items scraped", tone: "cold" },
                { key: "findings", label: "Findings extracted", tone: "amber" },
                { key: "validated", label: "Industry-validated", tone: "hot" },
              ]}
            />
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="section-title">How to read this report</div>
          </div>
          <div className="card" style={{ padding: 28 }}>
            <div className="grid grid-2" style={{ gap: 28 }}>
              <div>
                <div className="stat-label" style={{ marginBottom: 12 }}>Scoring</div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.8 }}>
                  Each finding's confidence score = <span style={{ fontFamily: "var(--mono)", color: "var(--amber)" }}>mentions × owner-credibility × recency × specificity</span>.
                  Vendor pitches (including advice that pivots into a sales pitch) are detected by Claude and excluded before any counting.
                  Mentions older than ~6 months are down-weighted; anything past ~18 months counts half.
                </div>
              </div>
              <div>
                <div className="stat-label" style={{ marginBottom: 12 }}>Confidence bands</div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.8 }}>
                  <strong style={{ color: "var(--hot)" }}>Strong</strong> — 8+ mentions, mostly verified owners, concrete detail.
                  <br /><strong style={{ color: "var(--amber)" }}>Moderate</strong> — 3+ mentions, a real pattern forming.
                  <br /><strong style={{ color: "var(--ink-faint)" }}>Emerging</strong> — single or few sources; monitored, not yet trusted.
                </div>
              </div>
            </div>
            {summary?.pipeline_notes && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-soft)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.7 }}>
                {summary.pipeline_notes}
              </div>
            )}
          </div>
        </div>

        <div className="foot">
          Retention Signal · Apify Reddit scrape → Claude classification → confidence scoring → industry benchmark → MongoDB. Every finding traceable to its original source.
        </div>
      </div>
    </>
  );
}
