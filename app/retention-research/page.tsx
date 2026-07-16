import { Topbar } from "@/components/Topbar";
import { RetentionResearchDashboard } from "@/components/RetentionResearchDashboard";
import { COMMUNITIES, combinedDataset } from "@/lib/retention-research";

// Static build: the underlying dataset is a one-off classified export, not a
// live-syncing source, so there's no revalidate interval here.
export default function RetentionResearch() {
  const combined = combinedDataset();
  const fetchedAt = combined.generated_at || new Date().toISOString();

  return (
    <>
      <Topbar version="Community Research v2" fetchedAt={fetchedAt} crossLinkHref="/" crossLinkLabel="All systems" />
      <RetentionResearchDashboard communities={COMMUNITIES} combined={combined} />
    </>
  );
}
