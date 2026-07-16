"use client";

export function CommunitySelector({
  options,
  active,
  onChange,
}: {
  options: { id: string; label: string; count: number }[];
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
          <span style={{ opacity: 0.85, marginLeft: 7, color: active === o.id ? undefined : "var(--ink-dim)" }}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}
