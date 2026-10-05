import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function RecordsLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("records");
  return <>{children}</>;
}
