// lib/retention.ts
// SERVER-ONLY data access for the Retention Signal report. Mirrors the
// pattern in lib/readout.ts: reads straight from MongoDB (retention_findings
// + retention_run_summary, written by the n8n retention-research pipeline),
// no synthetic fallback — an empty result renders an honest empty state
// rather than fake data. Client components must not import this file, it
// pulls in the Node-only mongodb driver.

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

// Same connection pattern as lib/readout.ts's getMongoDb() — not extracted
// into a shared helper because that file explicitly keeps Mongo logic
// server-only and un-exported; this mirrors it exactly rather than adding
// a new shared module for a two-collection read.
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
      .find({})
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
      .find({})
      .sort({ run_timestamp: -1 })
      .limit(1)
      .toArray();
    return { summary: (doc[0] as RetentionRunSummary) || null, error: null };
  } catch (e: any) {
    return { summary: null, error: e?.message || "retention_run_summary query failed" };
  }
}
