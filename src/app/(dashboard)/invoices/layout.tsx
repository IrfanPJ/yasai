import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function InvoicesLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("invoices");
  return <>{children}</>;
}
