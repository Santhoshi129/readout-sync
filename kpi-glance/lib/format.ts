/** How long a snapshot may be before the page calls it out as stale. */
export const STALE_AFTER_HOURS = 36;

export function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 36e5;
}

/** "synced 3h ago" — short enough to sit in a section header. */
export function relativeSync(iso: string | null | undefined): string | null {
  const h = hoursSince(iso);
  if (h === null) return null;
  if (h < 1) return "synced just now";
  if (h < 24) return `synced ${Math.round(h)}h ago`;
  const d = Math.round(h / 24);
  return `synced ${d}d ago`;
}

/** Absolute timestamp in ET, for the page header. */
export function easternStamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(t));
}

/** The most recent of a set of snapshot timestamps. */
export function newestStamp(stamps: (string | null | undefined)[]): string | null {
  const valid = stamps
    .filter((s): s is string => typeof s === "string")
    .map((s) => Date.parse(s))
    .filter((t) => !Number.isNaN(t));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid)).toISOString();
}
