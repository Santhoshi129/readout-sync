import { MongoClient, Db } from "mongodb";

/**
 * Reuses the exact same MongoDB your Readout sync already writes to.
 * Set MONGODB_URI in Vercel to the same connection string already
 * configured on the original readout-sync Vercel project — no new
 * database, no new signup, just the existing one.
 */

let cachedClient: MongoClient | null = null;

export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  try {
    if (!cachedClient) {
      cachedClient = new MongoClient(uri);
      await cachedClient.connect();
    }
    // If MONGODB_DB isn't set, this uses whatever database name is
    // embedded in the URI itself (the usual case for a full connection string).
    return cachedClient.db(process.env.MONGODB_DB || undefined);
  } catch {
    return null;
  }
}
