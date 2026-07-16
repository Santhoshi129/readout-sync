// TEMP - delete once total_identified is confirmed correct.
// Exposes the raw blended_readout_live payload (including the _debug block
// added to buildAppAdoption) so we can inspect it without GitHub Actions log
// access. No secrets are in this payload - safe to leave briefly, but not a
// permanent route.
import { NextResponse } from "next/server";
import { readCacheDoc } from "@/lib/readout";

export const dynamic = "force-dynamic";

export async function GET() {
  const doc = await readCacheDoc("blended_readout_live");
  return NextResponse.json(doc ?? { error: "no doc found for blended_readout_live" });
}
