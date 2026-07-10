"use client";
import { useState, useEffect } from "react";
import { timeAgo } from "@/lib/format";
import { RefreshButton } from "@/components/RefreshButton";

export function Topbar({ version, fetchedAt, crossLinkHref, crossLinkLabel }: { version?: string; fetchedAt: string; crossLinkHref?: string; crossLinkLabel?: string }) {
  const [logoFailed, setLogoFailed] = useState(false);
  // Re-render once a second so "Live · 12s ago" actually counts up in the
  // browser instead of freezing at whatever value it had on page load.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="topbar">
      <a className="brand" href="/">
        {logoFailed ? (
          <div className="brand-mark brand-mark-fallback">TWU</div>
        ) : (
          <img
            src="/logo.png"
            alt="Blended Athletics"
            className="brand-mark"
            onError={() => setLogoFailed(true)}
          />
        )}
        <span className="brand-name">Blended Athletics · The Readout</span>
      </a>
      <div className="topbar-right">
        {crossLinkHref && (
          <a href={crossLinkHref} style={{ color: "var(--ink-dim)", textDecoration: "none", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--border)", borderRadius: 999, padding: "5px 11px" }}>
            {crossLinkLabel} →
          </a>
        )}
        <RefreshButton />
        <span>{version ? `Readout ${version}` : "Readout"}</span>
        <span><span className="live-dot" /> Synced {timeAgo(fetchedAt)}</span>
      </div>
    </div>
  );
}
