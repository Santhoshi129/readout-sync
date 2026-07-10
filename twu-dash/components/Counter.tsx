"use client";
import { useEffect, useRef, useState } from "react";

// Animates a number counting up to its target whenever the target changes
// (first paint, or a 30s revalidation bringing in a new value). Falls back
// to an instant jump for prefers-reduced-motion, so this never becomes a
// distraction, just a small signal that the number is live, not static.
export function Counter({ value, duration = 900 }: { value: number | null; duration?: number }) {
  const [display, setDisplay] = useState<number | null>(value);
  const prev = useRef<number | null>(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) {
      setDisplay(null);
      return;
    }
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current ?? 0;
    const to = value;
    prev.current = value;

    if (reduce || from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out cubic

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = ease(t);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (display == null) return <>N/A</>;
  return <>{display.toLocaleString("en-US")}</>;
}
