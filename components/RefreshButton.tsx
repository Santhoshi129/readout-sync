"use client";
// Refresh now: triggers the n8n sync webhook, then polls until the cache's
// generated_at moves past the trigger time, then re-renders the page with
// the fresh numbers. Data is never older than 5 minutes anyway; this button
// exists for the moments you want it current to the second.
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "syncing" | "done" | "failed";

export function RefreshButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function refresh() {
    if (phase === "syncing") return;
    setPhase("syncing");
    const startedAt = Date.now();
    try {
      const trig = await fetch("/api/refresh", { method: "POST" });
      if (!trig.ok) throw new Error("trigger failed");
    } catch {
      setPhase("failed");
      timers.current.push(setTimeout(() => setPhase("idle"), 4000));
      return;
    }

    // Poll the cache timestamp until it is newer than when we clicked.
    const poll = async (attempt: number) => {
      if (attempt > 60) {
        // ~5 minutes (GitHub Actions runs can queue). The sync may still
        // finish; the page auto-picks it up later.
        setPhase("failed");
        timers.current.push(setTimeout(() => setPhase("idle"), 4000));
        return;
      }
      try {
        const res = await fetch("/api/refresh", { cache: "no-store" });
        const j = await res.json();
        const gen = j?.generatedAt ? new Date(j.generatedAt).getTime() : 0;
        if (gen > startedAt - 1000) {
          router.refresh();
          setPhase("done");
          timers.current.push(setTimeout(() => setPhase("idle"), 3000));
          return;
        }
      } catch {
        // keep polling
      }
      timers.current.push(setTimeout(() => poll(attempt + 1), 5000));
    };
    timers.current.push(setTimeout(() => poll(1), 4000));
  }

  const label =
    phase === "syncing" ? "Syncing live sources..." :
    phase === "done" ? "Up to date" :
    phase === "failed" ? "Sync not confirmed" :
    "Refresh now";

  return (
    <button
      onClick={refresh}
      disabled={phase === "syncing"}
      title="Re-runs the full live sync right now instead of waiting for the next scheduled run"
      style={{
        background: phase === "done" ? "rgba(201,168,76,0.14)" : "transparent",
        color: phase === "failed" ? "var(--bad, #e5484d)" : "var(--amber, #C9A84C)",
        border: "1px solid var(--border, #2a2a2a)",
        borderRadius: 999,
        padding: "5px 12px",
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: phase === "syncing" ? "wait" : "pointer",
      }}
    >
      {phase === "syncing" ? <span className="live-dot" style={{ marginRight: 6 }} /> : null}
      {label}
    </button>
  );
}
