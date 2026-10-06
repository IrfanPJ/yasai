import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Records" subtitle="Complete archive of all goods collection notes" />
      <TablePageSkeleton columns={7} />
    </>
  );
}
