import { Header } from "@/components/layout/header";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

export default function Loading() {
  return (
    <>
      <Header title="Audit Logs" subtitle="Track all system activity and changes" />
      <TablePageSkeleton columns={5} />
    </>
  );
}
