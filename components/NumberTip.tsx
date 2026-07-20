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
  side = "top",
}: {
  text: string;
  children: ReactNode;
  align?: "center" | "left" | "right";
  // "top" floats the tooltip above the trigger (fine when there's room
  // above, e.g. mid-page rows). "bottom" floats it below - use this for
  // anything near the top of the viewport (like the hero stat tiles),
  // where floating upward gets clipped by the browser's top edge.
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const pos =
    align === "left"
      ? { left: 0, transform: "none" }
      : align === "right"
      ? { right: 0, transform: "none" }
      : { left: "50%", transform: "translateX(-50%)" };
  const vertical = side === "bottom" ? { top: "135%" } : { bottom: "135%" };

  return (
    <span
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Touch devices never fire :hover/mouseenter at all, so tap support
      // is required, not optional - stopPropagation matters here because
      // this wraps content that sometimes sits inside a clickable parent
      // (e.g. a community-selector tab button), and tapping the number
      // should only toggle the tooltip, not also trigger the parent.
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
      tabIndex={0}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          style={{
            position: "absolute",
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
            ...vertical,
            ...pos,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
