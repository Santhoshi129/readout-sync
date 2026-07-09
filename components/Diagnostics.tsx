"use client";
import { useState } from "react";
import { fmt } from "@/lib/format";
import { Readout, pick } from "@/lib/readout";
import { CANARIES } from "@/lib/dashboard-ui";

function num(data: Readout | null, path: string): number | null {
  const v = pick(data, path);
  return typeof v === "number" ? v : v == null ? null : Number(v);
}

export function Diagnostics({ data }: { data: Readout | null }) {
  const [open, setOpen] = useState(false);
  const rows = CANARIES.map((c) => {
    const v = num(data, c.path) ?? 0;
    const bad = c.expect.includes("watch") ? v > 0 : v > 3;
    return { ...c, v, bad };
  });
  const badCount = rows.filter((r) => r.bad).length;

  return (
    <div style={{ marginBottom: 24 }}>
      <button className="diagnostics-toggle" data-open={open} onClick={() => setOpen((o) => !o)}>
        <span>
          Diagnostics — data-consistency checks · {badCount === 0 ? "all clean" : `${badCount} of ${rows.length} need a look`}
        </span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="grid grid-4" style={{ marginTop: 14 }}>
          {rows.map((c) => (
            <div className="canary" key={c.path}>
              <div>
                <div className="c-val" style={{ color: c.bad ? "var(--amber)" : "var(--good)" }}>{fmt(c.v)}</div>
                <div className="stat-label">{c.label}</div>
              </div>
              <div className="c-meta">
                <span className={`dot ${c.bad ? "watch" : "good"}`} style={{ display: "inline-block" }} />
                <div className="c-expect">{c.expect}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
