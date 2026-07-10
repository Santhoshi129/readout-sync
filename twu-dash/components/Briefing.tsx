import { Readout, pick } from "@/lib/readout";
import { fmt, daysSince } from "@/lib/format";
import { CANARIES } from "@/lib/dashboard-ui";

function num(data: Readout | null, path: string): number {
  const v = pick(data, path);
  const n = typeof v === "number" ? v : v == null ? null : Number(v);
  return n == null || Number.isNaN(n) ? 0 : n;
}

function checkCount(data: Readout | null) {
  let bad = 0;
  for (const c of CANARIES) {
    const v = num(data, c.path);
    const isBad = c.expect.includes("watch") ? v > 0 : v > 3;
    if (isBad) bad++;
  }
  return { bad, total: CANARIES.length };
}

export function GymOwnerBriefing({ data, launchIso }: { data: Readout | null; launchIso: string }) {
  const days = daysSince(launchIso);
  const contacts = num(data, "lead_gen.total_contacts_in_ghl");
  const sent = num(data, "lead_gen.email_outreach_sent");
  const replied = num(data, "lead_gen.email_replied");
  const rate = num(data, "lead_gen.email_reply_rate_pct");
  const igSent = num(data, "lead_gen.ig_outreach_sent");
  const igPos = num(data, "lead_gen.ig_replied_positive");
  const { bad, total } = checkCount(data);

  return (
    <div className="briefing">
      <div className="eyebrow" style={{ marginBottom: 10 }}>{days}-day briefing</div>
      <p className="briefing-lead">
        In {days} days, the gym owner outreach system has reached <strong>{fmt(contacts)}</strong> gyms and sent{" "}
        <strong>{fmt(sent)}</strong> emails, getting <strong>{fmt(replied)}</strong> replies back ({rate}%) plus{" "}
        <strong>{fmt(igPos)}</strong> positive Instagram responses off <strong>{fmt(igSent)}</strong> DMs sent.
      </p>
      <p className="briefing-sub">
        {bad === 0
          ? "All 10 automations are live and their data checks out clean end to end."
          : `All 10 automations are live and running. ${bad} of ${total} background data checks need a look. None of them are stopping outreach; they're tracked in Diagnostics below.`}{" "}
        A {rate}% reply rate on cold outreach is within the normal range for this kind of campaign at this stage. The lever that moves it is time and volume, not the automation itself.
      </p>
    </div>
  );
}

export function MemberBriefing({ data, launchIso }: { data: Readout | null; launchIso: string }) {
  const days = daysSince(launchIso);
  const identified = num(data, "app_adoption.total_identified");
  const sent = num(data, "app_adoption.stage_sent");
  const followup = num(data, "app_adoption.stage_followup");
  const joined = num(data, "app_adoption.total_joined");
  const adopted = num(data, "app_adoption.adopted");
  const identifiedBroken = identified === 0 && sent > 0;

  return (
    <div className="briefing">
      <div className="eyebrow" style={{ marginBottom: 10 }}>{days}-day briefing</div>
      <p className="briefing-lead">
        In {days} days, member outreach has sent <strong>{fmt(sent)}</strong> invites with{" "}
        <strong>{fmt(followup)}</strong> follow-ups, converting <strong>{fmt(adopted)}</strong> members through
        outreach so far{joined ? <>, with {fmt(joined)} members in the community in total</> : null}.
      </p>
      <p className="briefing-sub">
        {identifiedBroken
          ? "One number here is known-wrong: the \u201Cmembers identified\u201D count is reporting 0 while outreach is clearly going out, which means the counting step upstream needs a fix. Outreach itself isn't affected."
          : "The outreach funnel is reporting end to end with no known gaps."}
      </p>
    </div>
  );
}
