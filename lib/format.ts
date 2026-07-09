// lib/format.ts
export function fmt(n: number | string | null | undefined): string {
  if (n == null || n === "") return "N/A";
  const num = typeof n === "string" ? Number(n) : n;
  if (typeof num === "number" && !Number.isNaN(num)) return num.toLocaleString("en-US");
  return String(n);
}

export function pct(n: number | string | null | undefined): string {
  if (n == null) return "N/A";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return "N/A";
  return `${num}%`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "N/A";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "N/A";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function longDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
