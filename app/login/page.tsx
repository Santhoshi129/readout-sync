"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) router.push("/");
    else setErr("That password didn't match. Try again.");
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
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
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>The Readout</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em" }}>
          Systems dashboard
        </h1>
        <p style={{ color: "var(--ink-dim)", fontSize: 14, marginTop: 8 }}>
          Enter the shared password to continue.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        <button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Enter"}
        </button>
        {err && <div className="login-err">{err}</div>}
      </form>
    </div>
  );
}
