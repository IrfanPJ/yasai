import { StatOverviewSkeleton } from "@/components/skeletons/stat-overview-skeleton";

export default function Loading() {
  return <StatOverviewSkeleton cards={4} listRows={6} />;
}
