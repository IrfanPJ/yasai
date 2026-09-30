import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { ConsolidationSheet, ConsolidationSheetItem } from "@/types";
import { MANIFEST_ZONE_LABELS } from "@/types";

const HEADERS = [
  "Sl No", "Date", "Customer", "Supplier", "Delivery Place",
  "Weight(Kg)", "CBM", "Ref", "Shipping Mark", "Packages", "Pallets", "Shipment In",
];

export async function generateManifestExcel(
  sheet: ConsolidationSheet,
  items: ConsolidationSheetItem[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Sheet1");
  const zoneLabel = MANIFEST_ZONE_LABELS[sheet.zone].toUpperCase();
  const docLabel = sheet.status === "manifest" ? "MANIFEST" : "PENDING CONSOLIDATION SHEET";
  const asOf = format(new Date(), "dd-MM-yy");

  ws.mergeCells(1, 1, 1, HEADERS.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `${zoneLabel} ${docLabel} AS ON ${asOf}`;
  titleCell.font = { bold: true };
  titleCell.alignment = { horizontal: "center" };

  const headerRow = ws.addRow(HEADERS);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  items.forEach((item, i) => {
    const gcn = item.gcn;
    ws.addRow([
      i + 1,
      gcn?.created_at ? format(new Date(gcn.created_at), "d/M/yyyy") : "",
      gcn?.consignee_name || "",
      gcn?.shipper_name || "",
      gcn?.destination || "",
      gcn?.weight_kg || "",
      gcn?.volume_cbm || "",
      gcn?.doc_ref_number || "",
      gcn?.shipping_mark || "",
      gcn?.num_packages || "",
      item.pallet_count,
      MANIFEST_ZONE_LABELS[sheet.zone],
    ]);
  });

  ws.mergeCells(items.length + 3, 1, items.length + 3, HEADERS.length);
  const footerCell = ws.getCell(items.length + 3, 1);
  footerCell.value = `${MANIFEST_ZONE_LABELS[sheet.zone]} - ${sheet.pallet_count} Pallets - ${sheet.cbm_total.toFixed(3)} CBM`;
  footerCell.font = { bold: true };

  ws.columns.forEach((col, i) => {
    col.width = [6, 12, 20, 20, 16, 12, 9, 16, 14, 16, 9, 12][i] || 14;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
