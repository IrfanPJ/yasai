import { format } from "date-fns";
import type { GoodsCollectionNote, UserRole } from "@/types";

// Editing a row's financial fields (PATCH) is finance-restricted. Uploading
// a document (POST/DELETE on /upload) is lower-stakes and also opened up to
// warehouse roles, since they're the ones using the consolidation sheet view
// this also appears on.
export const GR_REPORT_EDIT_ROLES: UserRole[] = ["admin", "operations", "finance"];
export const GR_REPORT_UPLOAD_ROLES: UserRole[] = ["admin", "operations", "finance", "warehouse", "warehouse_supervisor"];

// Total package quantity from the mixed package_items lines (pallets + pieces
// + boxes + ...). Falls back to 0 for legacy GCNs with no package_items.
export function totalPackageQtyFromGcn(gcn: Pick<GoodsCollectionNote, "package_items">): number {
  return (gcn.package_items || []).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
}

// Builds the gr_report_entries insert payload auto-filled from a freshly
// created GCN. Fields the GCN has no equivalent for (items, pickup_point)
// are left for manual entry on the GR Report grid.
export function gcnToGrReportInsert(gcn: GoodsCollectionNote) {
  return {
    gcn_id: gcn.id,
    entry_date: gcn.created_at,
    cr_number: gcn.collection_number,
    shipper: gcn.shipper_name,
    consignee: gcn.consignee_name,
    doc_ref_number: gcn.doc_ref_number || null,
    item_category: gcn.commodity || null,
    item_package: gcn.num_packages || null,
    total_package_qty: totalPackageQtyFromGcn(gcn),
    cbm: gcn.volume_cbm ?? null,
  };
}

// Human-readable label for an export's date range — used in the file name,
// the sheet/PDF title, and nowhere else, so it stays purely presentational.
export function rangeLabelFromParams(from: string | null, to: string | null): string {
  const fmt = (d: string) => format(new Date(d), "d MMM yyyy");
  if (from && to) return from === to ? fmt(from) : `${fmt(from)} - ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Up to ${fmt(to)}`;
  return "All Entries";
}
