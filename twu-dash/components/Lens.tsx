"use client";
import { useState } from "react";

export function Lens({ technical, business }: { technical: string[]; business: string[] }) {
  const [view, setView] = useState<"tech" | "biz">("biz");
  const rows = view === "tech" ? technical : business;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="eyebrow muted">
          {view === "tech" ? "Architect view: how it's built" : "Business view: what it's worth"}
        </div>
        <div className="lens">
          <button className={view === "biz" ? "on" : ""} onClick={() => setView("biz")}>
            Business
          </button>
          <button className={view === "tech" ? "on" : ""} onClick={() => setView("tech")}>
            Technical
          </button>
        </div>
      </div>
      <div className="prose">
        {rows.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
