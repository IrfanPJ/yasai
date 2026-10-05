import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("collections");
  return <>{children}</>;
}
