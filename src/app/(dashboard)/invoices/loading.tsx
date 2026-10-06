import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Invoices" subtitle="Manage billing and track payments" />
      <TablePageSkeleton columns={6} />
    </>
  );
}
