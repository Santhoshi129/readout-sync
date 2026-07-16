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
        <button key={o.id} className={active === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
          <span style={{ opacity: 0.65, marginLeft: 7 }}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}
