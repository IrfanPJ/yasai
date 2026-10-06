import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Collections" subtitle="Manage all goods collection notes" />
      <TablePageSkeleton columns={7} />
    </>
  );
}
