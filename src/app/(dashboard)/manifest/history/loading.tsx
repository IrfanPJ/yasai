import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Manifest History" subtitle="Every GCN removed from a pending consolidation sheet, and where it stands now" />
      <TablePageSkeleton columns={6} />
    </>
  );
}
