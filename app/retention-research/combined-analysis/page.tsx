import { Topbar } from "@/components/Topbar";
import { CombinedAnalysisDashboard } from "@/components/CombinedAnalysisDashboard";
import { COMMUNITIES, combinedDataset } from "@/lib/retention-research";

export default function CombinedAnalysis() {
  const combined = combinedDataset();
  const fetchedAt = combined.generated_at || new Date().toISOString();

  return (
    <>
      <Topbar
        version="Community Research v2"
        fetchedAt={fetchedAt}
        crossLinkHref="/retention-research"
        crossLinkLabel="Per-community view"
      />
      <CombinedAnalysisDashboard communities={COMMUNITIES} />
    </>
  );
}
