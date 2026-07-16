"use client";
import { useState } from "react";
import { GLOSSARY } from "@/lib/retention-research";

export function RetentionGlossary() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="diagnostics-toggle"
        data-open={open}
        style={{ border: "none", borderRadius: 16 }}
      >
        <span>How to read this page — glossary of terms</span>
        <span className="chev">&#9656;</span>
      </button>
      {open && (
        <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {GLOSSARY.map((g) => (
            <div key={g.term} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) 1fr", gap: 16, alignItems: "start" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>{g.term}</div>
              <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.55 }}>{g.meaning}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
