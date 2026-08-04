import {
  buildMemberHealth,
  buildOutreach,
  buildPipeline,
  buildProductUsage,
  NOT_YET_LIVE,
} from "@/lib/kpi-data";
import {
  fetchLatestGrowthOutreach,
  fetchLatestOverlap,
  fetchLatestRetentionPayload,
} from "@/lib/live-data";
import { easternStamp, hoursSince, newestStamp, STALE_AFTER_HOURS } from "@/lib/format";
import SectionBlock from "@/components/SectionBlock";
import ProblemRadar from "@/components/ProblemRadar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [overlap, retention, growthOutreach] = await Promise.all([
    fetchLatestOverlap(),
    fetchLatestRetentionPayload(),
    fetchLatestGrowthOutreach(),
  ]);

  // Order matters: usage and member health first (is the product working),
  // then pipeline and outreach (is it growing). The Problem Radar above
  // covers the third question on its own.
  const sections = [
    buildProductUsage(overlap),
    buildMemberHealth(overlap, retention),
    buildPipeline(growthOutreach),
    buildOutreach(growthOutreach),
  ].filter((s) => s.kpis.length > 0);

  const latest = newestStamp(sections.map((s) => s.syncedAt));
  const latestStamp = easternStamp(latest);
  const age = hoursSince(latest);
  const stale = age !== null && age > STALE_AFTER_HOURS;
  const hasData = sections.length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-7 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Train With Us / Blended Athletics
          </span>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-[26px]">KPI Glance</h1>
        </div>
        <p className="text-[11.5px] text-ink-faint">
          {latestStamp ? (
            <>
              Data as of <span className="text-ink-dim">{latestStamp} ET</span> · daily sync
            </>
          ) : (
            "Awaiting first daily sync"
          )}
        </p>
      </header>

      {stale && (
        <div className="mb-5 rounded-xl border border-signal-warnDim bg-base-panel px-4 py-3">
          <p className="text-[13px] text-signal-warn">
            <span className="font-semibold">Data may be stale.</span>{" "}
            <span className="text-ink-dim">
              The most recent sync finished {Math.round(age!)} hours ago — the daily job may not have
              run. Treat the numbers below as last known, not current.
            </span>
          </p>
        </div>
      )}

      <div className="mb-7">
        <ProblemRadar sections={sections} />
      </div>

      {hasData ? (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-base-line bg-base-panel px-4 py-5">
          <p className="text-sm text-ink">No data has been synced yet.</p>
          <p className="mt-1 text-[12.5px] text-ink-dim">
            The daily jobs write their first snapshot on the next scheduled run. Nothing is shown here
            until real numbers exist — this page never displays placeholder values.
          </p>
        </div>
      )}

      <footer className="mt-10 border-t border-base-line pt-4">
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Read-only. Every figure is written once a day by a background job and read from cache — this
          page never calls GHL, the TWU API, or n8n on load. Any KPI without a confirmed data source is
          omitted entirely rather than estimated.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
          Not yet live:{" "}
          {NOT_YET_LIVE.map((item, i) => (
            <span key={item.label}>
              {i > 0 && " · "}
              <span className="text-ink-dim">{item.label}</span> ({item.reason})
            </span>
          ))}
          . Thresholds are working placeholders pending Kimberly&rsquo;s benchmarks.
        </p>
      </footer>
    </main>
  );
}
