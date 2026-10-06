import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Waybills" subtitle="Manage shipment waybills" />
      <TablePageSkeleton columns={6} />
    </>
  );
}
