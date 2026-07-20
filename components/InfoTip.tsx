"use client";
import { useState } from "react";

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 6 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        role="button"
        aria-label="More info"
        style={{
          width: 15,
          height: 15,
          borderRadius: "50%",
          border: "1px solid var(--ink-faint)",
          color: "var(--ink-faint)",
          fontFamily: "var(--mono)",
          fontSize: 9.5,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        i
      </span>
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "140%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 240,
            background: "var(--card-raised)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            fontFamily: "var(--font)",
            color: "var(--ink-dim)",
            lineHeight: 1.5,
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            textTransform: "none",
            letterSpacing: "normal",
            fontWeight: 400,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
