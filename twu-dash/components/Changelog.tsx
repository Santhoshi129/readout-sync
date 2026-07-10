import { ChangeEntry } from "@/lib/flows";
import { longDate } from "@/lib/format";

export function Changelog({ entries }: { entries: ChangeEntry[] }) {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div>
      {sorted.map((e, i) => (
        <div className="change" key={i}>
          <div className="change-date">{longDate(e.date)}</div>
          <div className="change-body">
            <span className={`change-status st-${e.status}`}>{e.status.replace("-", " ")}</span>
            <div className="change-text">{e.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
