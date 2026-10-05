import { requireModulePageAccess } from "@/lib/require-module-access";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  await requireModulePageAccess("job_orders");
  return <>{children}</>;
}
