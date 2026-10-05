import { Header } from "@/components/layout/header";
import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("finance");
  return (
    <>
      <Header title="Finance" subtitle="Fund collections, transfers & payments" />
      {children}
    </>
  );
}
