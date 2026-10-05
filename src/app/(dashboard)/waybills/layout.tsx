import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function WaybillsLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("waybills");
  return <>{children}</>;
}
