import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function GrReportLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("gr_report");
  return <>{children}</>;
}
