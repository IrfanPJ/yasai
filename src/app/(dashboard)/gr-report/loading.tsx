import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="GR Report" subtitle="Master collection log — search, edit, and track document uploads" />
      <TablePageSkeleton columns={9} rows={10} />
    </>
  );
}
