"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { timeAgo } from "@/lib/format";

export function Topbar({ version, fetchedAt }: { version?: string; fetchedAt: string }) {
  const router = useRouter();
  const [logoFailed, setLogoFailed] = useState(false);
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <div className="topbar">
      <a className="brand" href="/">
        {logoFailed ? (
          <div className="brand-mark brand-mark-fallback">TWU</div>
        ) : (
          <img
            src="/logo.png"
            alt="Blended Athletics"
            className="brand-mark"
            onError={() => setLogoFailed(true)}
          />
        )}
        <span className="brand-name">Blended Athletics · The Readout</span>
      </a>
      <div className="topbar-right">
        <span>{version ? `Readout ${version}` : "Readout"}</span>
        <span><span className="live-dot" /> Live · {timeAgo(fetchedAt)}</span>
        <button
          onClick={logout}
          style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
