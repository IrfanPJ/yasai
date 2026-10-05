// Canonical list of modules that can be individually hidden/restricted per
// user, via user_profiles.module_access. Shared by the sidebar (client) and
// the page/API guards (server) so there's one source of truth.
export type ModuleKey =
  | "collections"
  | "job_orders"
  | "manifest"
  | "invoices"
  | "gr_report"
  | "records"
  | "waybills"
  | "finance"
  | "audit_logs";

export const MODULE_KEYS: ModuleKey[] = [
  "collections",
  "job_orders",
  "manifest",
  "invoices",
  "gr_report",
  "records",
  "waybills",
  "finance",
  "audit_logs",
];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  collections: "Collections",
  job_orders: "Job Orders",
  manifest: "Manifest",
  invoices: "Invoices",
  gr_report: "GR Report",
  records: "Records",
  waybills: "Waybills",
  finance: "Finance",
  audit_logs: "Audit Logs",
};

// NULL/undefined module_access = unrestricted (today's default behavior).
// A set array only narrows access, never grants beyond what role allows.
export function hasModuleAccess(
  moduleAccess: string[] | null | undefined,
  moduleKey: ModuleKey
): boolean {
  return moduleAccess == null || moduleAccess.includes(moduleKey);
}
