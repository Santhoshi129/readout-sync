// components/AdjacentToolingWishlist.tsx
//
// Surfaces findings tagged not_addressable + outside_scope_type ==
// "adjacent_tooling" - requests where the person clearly wants *some*
// software fix (billing automation, dunning, a churn dashboard, an
// integrated ops platform) but the fix isn't TWU's community/connection
// layer. These are real product signal, just not a TWU build - they were
// previously indistinguishable from "no software could ever help" findings
// (coaching quality, facility conditions) inside the same not_addressable
// bucket. This panel pulls them out into their own list so they're visible
// rather than lost.
//
// Deliberately NOT styled or framed as a priority/build recommendation -
// this is a "here's what's outside our lane, worth someone else reviewing"
// list, not a roadmap input.

import type { Finding } from "@/lib/retention-research";
import { InfoTip } from "@/components/InfoTip";

export function AdjacentToolingWishlist({ findings }: { findings: Finding[] }) {
  const items = findings.filter(
    (f) => f.app_relevance === "not_addressable" && f.outside_scope_type === "adjacent_tooling"
  );

  if (items.length === 0) return null;

  return (
    <div className="card" style={{ padding: 28, marginBottom: 24 }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div className="section-title">
          Outside TWU&apos;s scope, worth knowing about
          <InfoTip text="Findings where someone clearly wants a software fix - billing automation, a churn dashboard, an integrated ops platform - but the fix isn't a community/connection feature, so it doesn't belong in the core-fit or partial-fit counts above. Not a build recommendation for TWU as-is; a signal that whoever owns adjacent tooling decisions might want to see." />
        </div>
        <div className="eyebrow muted">
          {items.length} finding{items.length === 1 ? "" : "s"} describing admin, billing, or ops tooling gym owners
          want - none of it TWU&apos;s member-connection layer, all of it a real ask someone made
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((f) => (
          <div
            key={f.id}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: "var(--bg-raised, rgba(255,255,255,0.02))",
              border: "1px solid var(--border-soft)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                {f.solution || f.evidence_snippet}
              </div>
              {f.permalink && (
                <a
                  href={f.permalink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap" }}
                >
                  source &#8599;
                </a>
              )}
            </div>
            {f.app_relevance_reasoning && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-dim)" }}>{f.app_relevance_reasoning}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
