import { Header } from "@/components/layout/header";
import { StatOverviewSkeleton } from "@/components/skeletons/stat-overview-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Manifest" subtitle="Pending consolidation sheets and finalized manifests, by warehouse zone" />
      <StatOverviewSkeleton cards={2} listRows={4} />
    </>
  );
}
