import type { GoodsCollectionNote } from "@/types";

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
    total_package_qty: totalPackageQtyFromGcn(gcn) || null,
    cbm: gcn.volume_cbm ?? null,
  };
}
