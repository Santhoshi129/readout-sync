import { kv } from "@vercel/kv";

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  try {
    const val = await kv.get<T>(key);
    return val ?? null;
  } catch {
    return null;
  }
}

export async function kvSetJSON(key: string, value: unknown): Promise<boolean> {
  try {
    await kv.set(key, value);
    return true;
  } catch {
    return false;
  }
}
