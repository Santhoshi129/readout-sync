// lib/retention.ts
// SERVER-ONLY data access for the Retention Signal report. Mirrors the
// pattern in lib/readout.ts: reads straight from MongoDB (retention_findings
// + retention_run_summary, written by the n8n retention-research pipeline),
// no synthetic fallback — an empty result renders an honest empty state
// rather than fake data. Client components must not import this file, it
// pulls in the Node-only mongodb driver.
//
// v2 changes:
// - _id is projected OUT of every query. Mongo ObjectIds are not plain
//   objects, and these rows are passed as props into client components
//   (FindingCard, RetentionLedger); Next.js hard-errors on non-serializable
//   props the moment real data lands.
// - Run-summary reads filter on run_timestamp existing, so the empty
//   documents written by the earlier misconfigured n8n insert node can
//   never be selected as "the latest run" again.
// - getRunHistory() added: every valid run summary, oldest first, for the
//   run-over-run trend chart.

export interface RetentionFinding {
  finding_key: string;
  pain_point_category?: string;
  pain_point: string;
  pain_point_examples?: string[];
  churn_bucket?: string;
  affiliate_segment?: string;
  frequency: number;
  confidence_band: string;
  community_confidence_score: number;
  avg_specificity: number;
  effectiveness_summary?: string;
  effectiveness_score: number | null;
  contradiction_flag?: boolean;
  top_solutions?: string[];
  solutions_by_frequency?: { solution: string; mentioned: number }[];
  feature_gaps_mentioned?: string[];
  disguised_pitch_count?: number;
  sample_sources?: { permalink?: string; author_type?: string; specificity?: number; upvotes?: number }[];
  industry_validated: boolean | null;
  benchmark_note: string | null;
  complicating_factor: string | null;
  source: string | null;
  twu_relevance: string | null;
  methodology_note?: string;
  last_updated?: string;
}

export interface RetentionRunSummary {
  run_id: string;
  run_timestamp: string;
  subreddits_scanned: string[];
  keywords_searched: string[];
  sort_method?: string;
  total_posts_scraped: number;
  total_comments_scraped: number;
  total_items_scraped: number;
  total_findings_extracted: number;
  findings_strong_confidence: number;
  findings_moderate_confidence: number;
  findings_emerging_confidence: number;
  findings_industry_validated: number;
  pipeline_notes?: string;
}

// Same connection pattern as lib/readout.ts's getMongoDb() — kept in sync
// with that file rather than extracted into a shared module.
let mongoClientPromise: Promise<any> | null = null;
async function getMongoDb(): Promise<any | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    if (!mongoClientPromise) {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri);
      mongoClientPromise = client.connect();
    }
    const client = await mongoClientPromise;
    return client.db();
  } catch {
    mongoClientPromise = null;
    return null;
  }
}

export async function getRetentionFindings(): Promise<{ findings: RetentionFinding[]; error: string | null }> {
  const db = await getMongoDb();
  if (!db) return { findings: [], error: "MongoDB not reachable" };
  try {
    const rows = await db
      .collection("retention_findings")
      // finding_key must exist — guards against any malformed writes from
      // before the n8n node fields were configured properly.
      .find({ finding_key: { $exists: true } })
      .project({ _id: 0 })
      .sort({ community_confidence_score: -1 })
      .toArray();
    return { findings: rows as RetentionFinding[], error: null };
  } catch (e: any) {
    return { findings: [], error: e?.message || "retention_findings query failed" };
  }
}

export async function getLatestRunSummary(): Promise<{ summary: RetentionRunSummary | null; error: string | null }> {
  const db = await getMongoDb();
  if (!db) return { summary: null, error: "MongoDB not reachable" };
  try {
    const doc = await db
      .collection("retention_run_summary")
      .find({ run_timestamp: { $exists: true } })
      .project({ _id: 0 })
      .sort({ run_timestamp: -1 })
      .limit(1)
      .toArray();
    return { summary: (doc[0] as RetentionRunSummary) || null, error: null };
  } catch (e: any) {
    return { summary: null, error: e?.message || "retention_run_summary query failed" };
  }
}

// Every valid pipeline run, oldest first — one point per run for the
// run-over-run trend. Returns [] (never fake points) when Mongo is down or
// fewer than one run has been recorded; the chart explains itself in that
// case instead of drawing an invented line.
export async function getRunHistory(limit = 60): Promise<RetentionRunSummary[]> {
  const db = await getMongoDb();
  if (!db) return [];
  try {
    const rows = await db
      .collection("retention_run_summary")
      .find({ run_timestamp: { $exists: true } })
      .project({
        _id: 0,
        run_id: 1,
        run_timestamp: 1,
        total_items_scraped: 1,
        total_findings_extracted: 1,
        findings_industry_validated: 1,
        findings_strong_confidence: 1,
      })
      .sort({ run_timestamp: -1 })
      .limit(limit)
      .toArray();
    return (rows as RetentionRunSummary[]).reverse();
  } catch {
    return [];
  }
}
