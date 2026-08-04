import {
  buildAlertMix,
  buildInstagramFunnel,
  buildMemberHealth,
  buildMemberSplit,
  buildOutreach,
  buildPipeline,
  buildPipelineFunnel,
  buildProductUsage,
  NOT_YET_LIVE,
} from "@/lib/kpi-data";
import {
  fetchLatestGrowthOutreach,
  fetchLatestOverlap,
  fetchLatestRetentionPayload,
} from "@/lib/live-data";
import { storeGetJSON } from "@/lib/store";
import {
  GrowthPoint,
  KEY_GROWTH_HISTORY,
  KEY_MEMBER_HISTORY,
  MemberPoint,
  Series,
} from "@/lib/history";
import { easternStamp, hoursSince, newestStamp, relativeSync, STALE_AFTER_HOURS } from "@/lib/format";
import SectionBlock from "@/components/SectionBlock";
import ProblemRadar from "@/components/ProblemRadar";
import FunnelBar from "@/components/FunnelBar";
import CompositionBar from "@/components/CompositionBar";
import Coverage from "@/components/Coverage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [overlap, retention, growthOutreach, memberHistory, growthHistory] = await Promise.all([
    fetchLatestOverlap(),
    fetchLatestRetentionPayload(),
    fetchLatestGrowthOutreach(),
    storeGetJSON<Series<MemberPoint>>(KEY_MEMBER_HISTORY),
    storeGetJSON<Series<GrowthPoint>>(KEY_GROWTH_HISTORY),
  ]);

  const memberPoints = memberHistory?.points ?? [];
  const growthPoints = growthHistory?.points ?? [];

  // Order matters: usage and member health first (is the product working),
  // then pipeline and outreach (is it growing). The Problem Radar above
  // covers the third question on its own.
  const productUsage = buildProductUsage(overlap, memberPoints);
  const memberHealth = buildMemberHealth(overlap, retention, memberPoints);
  const pipeline = buildPipeline(growthOutreach, growthPoints);
  const outreach = buildOutreach(growthOutreach, growthPoints);

  const sections = [productUsage, memberHealth, pipeline, outreach].filter(
    (s) => s.kpis.length > 0
  );

  const memberSplit = buildMemberSplit(overlap);
  const alertMix = buildAlertMix(retention);
  const pipelineFunnel = buildPipelineFunnel(growthOutreach);
  const igFunnel = buildInstagramFunnel(growthOutreach);

  const latest = newestStamp(sections.map((s) => s.syncedAt));
  const latestStamp = easternStamp(latest);
  const age = hoursSince(latest);
  const stale = age !== null && age > STALE_AFTER_HOURS;
  const hasData = sections.length > 0;

  return (
    <div className="min-h-screen">
      {/* Top bar mirrors the Readout dashboard's chrome. */}
      <header className="sticky top-0 z-20 border-b border-base-line bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-8">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber font-display text-[13px] font-bold text-black"
            aria-hidden
          >
            T
          </span>
          <span className="eyebrow !text-ink-dim">Blended Athletics · KPI Glance</span>

          <span className="ml-auto flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${stale ? "bg-signal-warn" : "bg-amber"}`}
              aria-hidden
            />
            <span className="eyebrow">{relativeSync(latest) ?? "awaiting first sync"}</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-7">
          <p className="eyebrow">Train With Us · daily threshold view</p>
          <h1 className="mt-2 font-display text-[30px] font-bold leading-tight text-ink sm:text-[36px]">
            KPI Glance
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-dim">
            Is it working, is it growing, and where are the problems — answered without clicking
            anything.{" "}
            {latestStamp && (
              <span className="text-ink-faint">Data as of {latestStamp} ET.</span>
            )}
          </p>
        </div>

        {stale && (
          <div className="mb-5 rounded-2xl border border-signal-warnDim bg-base-card px-5 py-4">
            <p className="text-[12.5px] text-signal-warn">
              <span className="font-semibold">Data may be stale.</span>{" "}
              <span className="text-ink-dim">
                The most recent sync finished {Math.round(age!)} hours ago — the daily job may not
                have run. Treat the numbers below as last known, not current.
              </span>
            </p>
          </div>
        )}

        <div className="mb-8">
          <ProblemRadar sections={sections} />
        </div>

        {hasData ? (
          <div className="flex flex-col gap-9">
            <SectionBlock section={productUsage} />

            {(memberSplit.length > 0 || alertMix.length > 0) && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <CompositionBar
                  title="Where the member base sits"
                  segments={memberSplit}
                  totalLabel="active members"
                />
                <CompositionBar
                  title="What today's alerts consist of"
                  segments={alertMix}
                  totalLabel="alerts raised"
                />
              </div>
            )}

            <SectionBlock section={memberHealth} />
            <SectionBlock section={pipeline} />

            {(pipelineFunnel.length > 0 || igFunnel.length > 0) && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <FunnelBar title="Gym-owner outreach funnel" stages={pipelineFunnel} />
                <FunnelBar title="Instagram funnel" stages={igFunnel} />
              </div>
            )}

            <SectionBlock section={outreach} />

            <Coverage sections={sections} pending={NOT_YET_LIVE} />
          </div>
        ) : (
          <div className="rounded-2xl border border-base-line bg-base-card px-5 py-6">
            <p className="text-[13.5px] text-ink">No data has been synced yet.</p>
            <p className="mt-1.5 text-[12.5px] text-ink-dim">
              The daily jobs write their first snapshot on the next scheduled run. Nothing is shown
              here until real numbers exist — this page never displays placeholder values.
            </p>
          </div>
        )}

        <footer className="mt-10 border-t border-base-line pt-4">
          <p className="eyebrow !tracking-[0.14em] leading-relaxed">
            Read-only · figures written once daily by background jobs and read from cache · no
            external calls on page load
          </p>
        </footer>
      </main>
    </div>
  );
}
