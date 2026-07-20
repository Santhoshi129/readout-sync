"use client";
import { useState, ReactNode } from "react";

// Same visual language as InfoTip, but wraps an arbitrary trigger (a number,
// a label, a whole row) instead of always rendering its own "i" icon -
// for spots where the number itself should be the hoverable thing, not an
// icon next to it.
export function NumberTip({
  text,
  children,
  align = "center",
}: {
  text: string;
  children: ReactNode;
  align?: "center" | "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const pos =
    align === "left"
      ? { left: 0, transform: "none" }
      : align === "right"
      ? { right: 0, transform: "none" }
      : { left: "50%", transform: "translateX(-50%)" };

  return (
    <span
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      tabIndex={0}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "135%",
            width: 230,
            background: "var(--card-raised)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            fontFamily: "var(--font)",
            color: "var(--ink-dim)",
            lineHeight: 1.5,
            zIndex: 60,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            textTransform: "none",
            letterSpacing: "normal",
            fontWeight: 400,
            pointerEvents: "none",
            ...pos,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
