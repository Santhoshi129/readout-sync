"use client";
import { NumberTip } from "@/components/NumberTip";

export function CommunitySelector({
  options,
  active,
  onChange,
}: {
  options: { id: string; label: string; count: number; note?: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="lens" style={{ flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o.id}
          className={active === o.id ? "on" : ""}
          onClick={() => onChange(o.id)}
          style={active === o.id ? undefined : { color: "var(--ink-dim)" }}
        >
          {o.label}
          {o.note ? (
            <NumberTip text={o.note}>
              <span style={{ opacity: 0.85, marginLeft: 7, color: active === o.id ? undefined : "var(--ink-dim)", borderBottom: "1px dotted currentColor" }}>
                {o.count}
              </span>
            </NumberTip>
          ) : (
            <span style={{ opacity: 0.85, marginLeft: 7, color: active === o.id ? undefined : "var(--ink-dim)" }}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
