import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Job Orders" subtitle="Consolidate GCNs into truck shipments" />
      <TablePageSkeleton columns={6} />
    </>
  );
}
