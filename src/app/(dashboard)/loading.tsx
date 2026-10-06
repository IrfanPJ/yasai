import { format } from "date-fns";
import { Header } from "@/components/layout/header";
import { StatOverviewSkeleton } from "@/components/skeletons/stat-overview-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Dashboard" subtitle={`Welcome back — ${format(new Date(), "EEEE, dd MMMM yyyy")}`} />
      <StatOverviewSkeleton cards={4} listRows={5} />
    </>
  );
}
