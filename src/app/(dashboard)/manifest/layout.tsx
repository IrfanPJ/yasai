import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function ManifestLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("manifest");
  return <>{children}</>;
}
