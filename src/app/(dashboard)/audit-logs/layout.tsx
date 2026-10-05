import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("audit_logs");
  return <>{children}</>;
}
