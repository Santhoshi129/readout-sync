"use client";
import { useState } from "react";
import { timeAgo } from "@/lib/format";

export function Topbar({ version, fetchedAt, crossLinkHref, crossLinkLabel }: { version?: string; fetchedAt: string; crossLinkHref?: string; crossLinkLabel?: string }) {
  const [logoFailed, setLogoFailed] = useState(false);
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
        <span>{version ? `Readout ${version}` : "Readout"}</span>
        <span><span className="live-dot" /> Live · {timeAgo(fetchedAt)}</span>
      </div>
    </div>
  );
}
