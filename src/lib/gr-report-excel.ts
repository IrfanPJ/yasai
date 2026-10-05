import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { GrReportEntry } from "@/types";

const HEADERS = [
  "Sl No", "Date", "CR#", "Shipper", "Consignee", "Doc Ref#",
  "Total Qty", "Balance", "Delivered Qty", "Job#", "Item Category",
  "Items", "Item Package", "Tracking", "Zone", "Destination",
  "Freight Invoice", "Delivery Note", "Invoice", "Invoiced Amount", "CBM",
];

export async function generateGrReportExcel(entries: GrReportEntry[], rangeLabel: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("GR Report");

  ws.mergeCells(1, 1, 1, HEADERS.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `GR REPORT — ${rangeLabel}`;
  titleCell.font = { bold: true };
  titleCell.alignment = { horizontal: "center" };

  const headerRow = ws.addRow(HEADERS);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  entries.forEach((e, i) => {
    ws.addRow([
      i + 1,
      e.entry_date ? format(new Date(e.entry_date), "d/M/yyyy") : "",
      e.cr_number || "",
      e.shipper || "",
      e.consignee || "",
      e.doc_ref_number || "",
      e.total_package_qty ?? "",
      e.balance,
      e.delivered_qty,
      e.job_number || "",
      e.item_category || "",
      e.items || "",
      e.item_package || "",
      e.tracking || "",
      e.pickup_point || "",
      e.destination || "",
      e.freight_invoice_url ? "Uploaded" : "Missing",
      e.delivery_note_url ? "Uploaded" : "Missing",
      e.invoice_url ? "Uploaded" : "Missing",
      e.invoiced_amount ?? 0,
      e.cbm ?? "",
    ]);
  });

  ws.mergeCells(entries.length + 3, 1, entries.length + 3, HEADERS.length);
  const footerCell = ws.getCell(entries.length + 3, 1);
  footerCell.value = `${entries.length} entries`;
  footerCell.font = { bold: true };

  ws.columns.forEach((col, i) => {
    col.width = [6, 12, 12, 18, 18, 14, 10, 10, 12, 12, 16, 16, 14, 14, 16, 16, 14, 14, 10, 14, 9][i] || 14;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
