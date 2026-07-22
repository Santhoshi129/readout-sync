// components/AdjacentToolingWishlist.tsx
//
// Surfaces findings tagged not_addressable + outside_scope_type ==
// "adjacent_tooling" - requests where the person clearly wants *some*
// software fix (billing automation, a churn dashboard, an integrated ops
// platform) but the fix isn't TWU's community/connection layer.
//
// The drill-down list reuses SectionInsight directly - the same scrollable,
// "X of Y findings in this view, scroll for every matching finding" panel
// used everywhere else on the dashboard (pain point frequency, severity,
// who's talking, solutions) - rather than a bespoke list, so this section
// behaves identically to every other interactive breakdown on the page
// instead of being a one-off.
//
// Deliberately NOT styled or framed as a priority/build recommendation -
// this is a "here's what's outside our lane, worth someone else reviewing"
// panel, not a roadmap input.

"use client";
import { useMemo, useState, useEffect } from "react";
import { Counter } from "@/components/Counter";
import { InfoTip } from "@/components/InfoTip";
import { SectionInsight } from "@/components/SectionInsight";
import type { Finding } from "@/lib/retention-research";
import { communityFromPermalink } from "@/lib/retention-research";

type Category =
  | "Billing & Payments"
  | "Booking & Scheduling"
  | "Analytics & Reporting"
  | "Membership Administration"
  | "Communication & CRM"
  | "Other Admin Tools";

const CATEGORY_ORDER: Category[] = [
  "Billing & Payments",
  "Analytics & Reporting",
  "Membership Administration",
  "Booking & Scheduling",
  "Communication & CRM",
  "Other Admin Tools",
];

// Keyword-scored, not a single first-match - a finding often touches more
// than one theme (a "churn dashboard" is both analytics and CRM), so this
// picks whichever theme is most represented in its own text.
function categorize(f: Finding): Category {
  const text = `${f.solution_category ?? ""} ${f.solution ?? ""} ${f.evidence_snippet ?? ""}`.toLowerCase();
  const scores: Record<Category, number> = {
    "Billing & Payments": 0,
    "Booking & Scheduling": 0,
    "Analytics & Reporting": 0,
    "Membership Administration": 0,
    "Communication & CRM": 0,
    "Other Admin Tools": 0,
  };
  const hit = (cat: Category, words: string[]) => {
    for (const w of words) if (text.includes(w)) scores[cat] += 1;
  };
  hit("Billing & Payments", ["billing", "payment", "invoic", "dunning", "card fail", "retry", "refund", "charge", "fee", "pricing", "revenue", "credit"]);
  hit("Booking & Scheduling", ["booking", "book a class", "schedul", "waitlist", "capacity", "calendar", "class time", "slot"]);
  hit("Analytics & Reporting", ["dashboard", "report", "analytic", "kpi", "metric", "churn rate", "retention rate", "predict", "utilization", "value at risk", "var "]);
  hit("Membership Administration", ["membership", "contract", "renewal", "cancel", "freeze", "pause", "transfer", "expiry", "sign-up form", "signup form"]);
  hit("Communication & CRM", ["crm", "email", "text message", "whatsapp", "reminder", "notification", "exit survey", "feedback card", "follow-up", "follow up"]);
  hit("Other Admin Tools", ["software", "platform", "system", "app", "tool"]);

  let best: Category = "Other Admin Tools";
  let bestScore = -1;
  for (const cat of CATEGORY_ORDER) {
    if (scores[cat] > bestScore) {
      bestScore = scores[cat];
      best = cat;
    }
  }
  return bestScore > 0 ? best : "Other Admin Tools";
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function AdjacentToolingWishlist({ findings }: { findings: Finding[] }) {
  const mounted = useMounted();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const items = useMemo(
    () =>
      findings
        .filter((f) => f.app_relevance === "not_addressable" && f.outside_scope_type === "adjacent_tooling")
        .map((f) => ({ f, category: categorize(f) })),
    [findings]
  );

  const byCategory = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const { category } of items) counts.set(category, (counts.get(category) ?? 0) + 1);
    return CATEGORY_ORDER.map((cat) => [cat, counts.get(cat) ?? 0] as [Category, number]).filter(([, c]) => c > 0);
  }, [items]);

  const ownerShare = useMemo(() => {
    if (items.length === 0) return 0;
    const ownerCount = items.filter(({ f }) => communityFromPermalink(f.permalink) === "r/gymowner").length;
    return Math.round((ownerCount / items.length) * 100);
  }, [items]);

  const byCommunityCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { f } of items) {
      const c = communityFromPermalink(f.permalink);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  if (items.length === 0) return null;

  const max = Math.max(1, ...byCategory.map(([, c]) => c));
  const activeMatches = activeCategory ? items.filter((i) => i.category === activeCategory).map((i) => i.f) : null;

  return (
    <div className="card" style={{ padding: 28, marginBottom: 24 }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div className="section-title">
          Outside TWU&apos;s scope, worth knowing about
          <InfoTip text="Findings where someone clearly wants a software fix - billing automation, a churn dashboard, an integrated ops platform - but the fix isn't a community/connection feature, so it doesn't belong in the core-fit or partial-fit counts above. Not a build recommendation for TWU as-is; a signal that whoever owns adjacent tooling decisions might want to see. Tap any category below to see every matching finding." />
        </div>
        <div className="eyebrow muted">
          {items.length} finding{items.length === 1 ? "" : "s"} describing admin, billing, or ops tooling - none of it TWU&apos;s
          member-connection layer, all of it a real ask someone made
        </div>
        {byCommunityCount.size > 1 && (
          <div style={{ marginTop: 6, fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--ink-faint)", letterSpacing: "0.02em" }}>
            {Array.from(byCommunityCount.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([c, n]) => `${c} ${n}`)
              .join("  \u00b7  ")}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: "14px 18px",
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02))",
          border: "1px solid var(--amber-deep, var(--border))",
          fontSize: 13,
          color: "var(--ink-dim)",
          lineHeight: 1.6,
        }}
      >
        {ownerShare >= 50
          ? `${ownerShare}% of this comes from gym owners specifically, and it reads less like feature requests and more like the business side of retention: churn dashboards, dunning, renewal reminders. That's the operational layer sitting underneath member community and connection, which is what TWU actually builds. Worth someone reviewing as a separate, adjacent opportunity, not folded into TWU's own roadmap.`
          : `This spans both member and owner voice findings, real software asks (billing, booking, reporting) that fall outside a member-facing connection layer. Worth someone reviewing as a separate, adjacent opportunity, not folded into TWU's own roadmap.`}
      </div>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        {byCategory.map(([cat, count], i) => {
          const isActive = activeCategory === cat;
          const w = Math.max(1.5, (count / max) * 100);
          return (
            <div
              key={cat}
              onClick={() => setActiveCategory((c) => (c === cat ? null : cat))}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 40px",
                alignItems: "center",
                gap: 16,
                cursor: "pointer",
                padding: "4px 8px",
                margin: "-4px -8px",
                borderRadius: 8,
                background: isActive ? "rgba(201,168,76,0.08)" : "transparent",
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  color: isActive ? "var(--amber)" : "var(--ink-dim)",
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {cat}
              </div>
              <div className="bar-track thin" style={{ opacity: activeCategory && !isActive ? 0.4 : 1, transition: "opacity 150ms ease" }}>
                <div className="bar-fill" style={{ width: mounted ? `${w}%` : 0, transitionDelay: `${i * 60}ms`, background: "var(--amber)" }} />
              </div>
              <div style={{ textAlign: "right", fontSize: 15, fontWeight: 700 }}>
                <Counter value={count} />
              </div>
            </div>
          );
        })}
      </div>

      <SectionInsight
        totalInView={items.length}
        matches={activeMatches}
        selectionLabel={activeCategory}
        generalText="Tap a category above to see every matching finding, with the reasoning for why it falls outside TWU's scope."
        onClear={() => setActiveCategory(null)}
        showReasoning
      />
    </div>
  );
}
