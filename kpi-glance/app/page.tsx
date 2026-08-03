import { growthKpis, outreachKpis, buildAdoptionKpis, buildRetentionKpis } from "@/lib/kpi-data";
import { fetchMemberOverlap, fetchLatestRetentionPayload } from "@/lib/live-data";
import SectionBlock from "@/components/SectionBlock";
import ProblemRadar from "@/components/ProblemRadar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [overlap, retention] = await Promise.all([fetchMemberOverlap(), fetchLatestRetentionPayload()]);
  const isLive = overlap !== null;

  const allSections = [
    { id: "growth", title: "Growth", question: "Is it growing?", kpis: growthKpis },
    { id: "outreach", title: "Outreach Effectiveness", question: "Is it working?", kpis: outreachKpis },
    { id: "adoption", title: "App Adoption", question: "Is it working? Is it growing?", kpis: buildAdoptionKpis(overlap) },
    { id: "retention", title: "Retention Health", question: "Where are the problems?", kpis: buildRetentionKpis(overlap, retention) },
  ];

  const allKpis = allSections.flatMap((s) => s.kpis);
  const sampleCount = allKpis.filter((k) => k.status === "sample").length;
  const liveCount = allKpis.filter((k) => k.status === "live").length;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 sm:py-10 max-w-6xl mx-auto">
      <header className="mb-8 flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-ink-faint">Train With Us / Blended Athletics</span>
        <h1 className="font-display font-bold text-3xl text-ink">KPI Glance</h1>
        <p className="text-sm text-ink-dim max-w-2xl">
          Is it working. Is it growing. Where are the problems. Every number below answers one of those three.
        </p>
        <p className={`text-xs mt-1 ${isLive ? "text-signal-good" : "text-signal-warn"}`}>
          {liveCount} of {allKpis.length} KPIs are live right now
          {!isLive && " — TWU_API_TOKEN isn't set in Vercel yet, so even the ready-to-go ones are showing sample data"}
          {isLive && sampleCount > 0 && `, ${sampleCount} still sample — the rest need GHL/ZenPlanner credentials or a persisted Retention Watch history`}
          .
        </p>
      </header>

      <div className="mb-8">
        <ProblemRadar allKpis={allKpis} />
      </div>

      <div className="flex flex-col gap-10">
        {allSections.map((section) => (
          <SectionBlock
            key={section.id}
            title={section.title}
            question={section.question}
            kpis={section.kpis}
          />
        ))}

        <section>
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="font-display font-bold text-lg text-ink">Revenue</h2>
            <span className="text-xs text-ink-faint uppercase tracking-wide">Is it working?</span>
          </div>
          <div className="rounded-lg border border-base-line bg-base-panel px-4 py-3">
            <p className="text-sm text-ink-dim">
              In scope — both TWU&rsquo;s own revenue and gym-client revenue — but not built yet. Waiting on a
              confirmed data source for each: TWU&rsquo;s own revenue (Stripe? GHL invoices?) and gym-client
              revenue (likely ZenPlanner billing).
            </p>
          </div>
        </section>
      </div>

      <footer className="mt-10 pt-4 border-t border-base-line">
        <p className="text-[11px] text-ink-faint">
          Internal use only. Not linked from the live site — visible only at this direct URL until the build is
          complete.
        </p>
      </footer>
    </main>
  );
}
