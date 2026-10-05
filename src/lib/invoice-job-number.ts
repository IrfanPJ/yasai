import type { Invoice } from "@/types";

export interface EffectiveJobNumber {
  value: string;
  source: "manual" | "linked";
}

// A freight invoice can both link a Job Order and carry a manually-typed
// job number. The manual entry always wins when both are present — it's
// how the creator corrects/overrides a mismatch with the linked job.
export function effectiveJobNumber(
  invoice: Pick<Invoice, "manual_job_number"> & { job_order?: { job_number?: string } | null }
): EffectiveJobNumber | null {
  if (invoice.manual_job_number) {
    return { value: invoice.manual_job_number, source: "manual" };
  }
  const linked = invoice.job_order?.job_number;
  if (linked) {
    return { value: linked, source: "linked" };
  }
  return null;
}
