"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, Check, X, Upload, FileSpreadsheet, FileText, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GrReportEntry, GrReportDocType } from "@/types";

interface GrReportGridProps {
  data: GrReportEntry[];
  canEdit: boolean;
  canUpload: boolean;
}

const DOC_SLOTS: { key: GrReportDocType; label: string; urlField: keyof GrReportEntry }[] = [
  { key: "freight_invoice", label: "Freight Invoice", urlField: "freight_invoice_url" },
  { key: "delivery_note", label: "Delivery Note", urlField: "delivery_note_url" },
  { key: "invoice", label: "Invoice", urlField: "invoice_url" },
];

type EditableField =
  | "entry_date" | "cr_number" | "shipper" | "consignee" | "doc_ref_number"
  | "item_category" | "items" | "item_package" | "pickup_point" | "destination"
  | "total_package_qty" | "cbm" | "delivered_qty" | "tracking" | "invoiced_amount";

const NUMERIC_FIELDS = new Set<EditableField>(["total_package_qty", "cbm", "delivered_qty", "invoiced_amount"]);
const DATE_FIELDS = new Set<EditableField>(["entry_date"]);

const SEARCH_FIELDS: (keyof GrReportEntry)[] = [
  "cr_number", "shipper", "consignee", "doc_ref_number", "job_number",
  "item_category", "items", "item_package", "pickup_point", "destination", "tracking",
];

export function GrReportGrid({ data, canEdit, canUpload }: GrReportGridProps) {
  const [rows, setRows] = useState<GrReportEntry[]>(data);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string; field: EditableField } | null>(null);
  const [draft, setDraft] = useState("");
  const [uploadingCell, setUploadingCell] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUpload = useRef<{ rowId: string; docType: GrReportDocType } | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function exportUrl(kind: "excel" | "pdf") {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    return `/api/gr-report/export/${kind}${qs ? `?${qs}` : ""}`;
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      SEARCH_FIELDS.some((field) => String(row[field] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  function startEdit(row: GrReportEntry, field: EditableField) {
    if (!canEdit) return;
    setEditing({ id: row.id, field });
    setDraft(String(row[field] ?? ""));
  }

  async function commitEdit() {
    if (!editing) return;
    const { id, field } = editing;
    const row = rows.find((r) => r.id === id);
    setEditing(null);
    if (!row) return;

    const raw = draft.trim();
    if (NUMERIC_FIELDS.has(field) && raw !== "" && Number.isNaN(Number(raw))) {
      toast.error("Enter a valid number");
      return;
    }
    const value: string | number | null = NUMERIC_FIELDS.has(field)
      ? (raw === "" ? null : Number(raw))
      : (raw === "" ? null : raw);

    if (String(row[field] ?? "") === String(value ?? "")) return;

    const previous = row[field];
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

    try {
      const res = await fetch(`/api/gr-report/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch {
      toast.error("Failed to save — reverted");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: previous } : r)));
    }
  }

  function openUploadPicker(rowId: string, docType: GrReportDocType) {
    if (!canUpload) return;
    pendingUpload.current = { rowId, docType };
    fileInputRef.current?.click();
  }

  async function handleFileChosen(file: File) {
    const pending = pendingUpload.current;
    pendingUpload.current = null;
    if (!pending) return;
    const { rowId, docType } = pending;
    const cellKey = `${rowId}-${docType}`;

    setUploadingCell(cellKey);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);
      const res = await fetch(`/api/gr-report/${rowId}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const { record } = await res.json();
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...record } : r)));
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingCell(null);
    }
  }

  function renderEditableCell(row: GrReportEntry, field: EditableField, display: string, extraClass = "") {
    const isEditing = editing?.id === row.id && editing.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          type={NUMERIC_FIELDS.has(field) ? "number" : DATE_FIELDS.has(field) ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(null);
          }}
          className="w-full min-w-[90px] rounded border border-[#E67A32] px-1.5 py-1 text-sm outline-none"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => startEdit(row, field)}
        className={cn(
          "w-full text-left px-1.5 py-1 rounded text-sm truncate",
          canEdit && "hover:bg-[#F7F0EA] cursor-text",
          !canEdit && "cursor-default",
          extraClass
        )}
        disabled={!canEdit}
      >
        {display || <span className="text-muted-foreground">—</span>}
      </button>
    );
  }

  function renderDocCell(row: GrReportEntry, slot: (typeof DOC_SLOTS)[number]) {
    const url = row[slot.urlField] as string | null | undefined;
    const cellKey = `${row.id}-${slot.key}`;
    const isUploading = uploadingCell === cellKey;

    if (url) {
      return (
        <button
          type="button"
          onClick={() => window.open(url, "_blank")}
          title={`View ${slot.label}`}
          className="mx-auto flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-700 hover:bg-green-200"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => openUploadPicker(row.id, slot.key)}
        title={canUpload ? `Upload ${slot.label}` : "Not uploaded"}
        disabled={!canUpload || isUploading}
        className={cn(
          "mx-auto flex items-center justify-center h-6 w-6 rounded-full",
          canUpload ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-red-50 text-red-400"
        )}
      >
        {isUploading ? (
          <Upload className="h-3.5 w-3.5 animate-pulse" />
        ) : canUpload ? (
          <Upload className="h-3 w-3" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileChosen(file);
          e.target.value = "";
        }}
      />

      <div className="p-3 md:p-4 border-b flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CR#, shipper, consignee, job#, tracking..."
            className="pl-9 h-9 text-sm w-full"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-sm w-36"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 text-sm w-36"
            aria-label="To date"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={exportUrl("excel")}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={exportUrl("pdf")}>
              <FileText className="h-3.5 w-3.5" />
              <Download className="h-3 w-3" />
              PDF
            </a>
          </Button>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {rows.length} entries
        </span>
      </div>

      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[1900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-32">CR#</TableHead>
              <TableHead className="w-36">Shipper</TableHead>
              <TableHead className="w-36">Consignee</TableHead>
              <TableHead className="w-28">Doc Ref#</TableHead>
              <TableHead className="w-24 text-right">Total Qty</TableHead>
              <TableHead className="w-24 text-right">Balance</TableHead>
              <TableHead className="w-24 text-right">Delivered</TableHead>
              <TableHead className="w-28">Job#</TableHead>
              <TableHead className="w-32">Item Category</TableHead>
              <TableHead className="w-32">Items</TableHead>
              <TableHead className="w-28">Item Package</TableHead>
              <TableHead className="w-28">Job Date</TableHead>
              <TableHead className="w-28">Tracking</TableHead>
              <TableHead className="w-32">Zone</TableHead>
              <TableHead className="w-32">Destination</TableHead>
              <TableHead className="w-12 text-center">F</TableHead>
              <TableHead className="w-12 text-center">D</TableHead>
              <TableHead className="w-12 text-center">I</TableHead>
              <TableHead className="w-28 text-right">Invoiced</TableHead>
              <TableHead className="w-20 text-right">CBM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={21} className="text-center py-12 text-muted-foreground">
                  No GR Report entries yet — they&apos;re created automatically when a GCN is collected.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{renderEditableCell(row, "entry_date", row.entry_date ? row.entry_date.slice(0, 10) : "")}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-[#071A3A] dark:text-[#E67A32]">
                    {renderEditableCell(row, "cr_number", row.cr_number || "")}
                  </TableCell>
                  <TableCell>{renderEditableCell(row, "shipper", row.shipper || "")}</TableCell>
                  <TableCell>{renderEditableCell(row, "consignee", row.consignee || "")}</TableCell>
                  <TableCell>{renderEditableCell(row, "doc_ref_number", row.doc_ref_number || "")}</TableCell>
                  <TableCell className="text-right">{renderEditableCell(row, "total_package_qty", row.total_package_qty != null ? String(row.total_package_qty) : "", "text-right")}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground px-1.5 py-1">{row.balance}</TableCell>
                  <TableCell className="text-right">{renderEditableCell(row, "delivered_qty", String(row.delivered_qty ?? 0), "text-right")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground px-1.5 py-1">{row.job_number || "—"}</TableCell>
                  <TableCell>{renderEditableCell(row, "item_category", row.item_category || "")}</TableCell>
                  <TableCell>{renderEditableCell(row, "items", row.items || "")}</TableCell>
                  <TableCell>{renderEditableCell(row, "item_package", row.item_package || "")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground px-1.5 py-1">{row.job_date ? row.job_date.slice(0, 10) : "—"}</TableCell>
                  <TableCell>{renderEditableCell(row, "tracking", row.tracking || "")}</TableCell>
                  <TableCell>{renderEditableCell(row, "pickup_point", row.pickup_point || "")}</TableCell>
                  <TableCell>{renderEditableCell(row, "destination", row.destination || "")}</TableCell>
                  <TableCell className="text-center">{renderDocCell(row, DOC_SLOTS[0])}</TableCell>
                  <TableCell className="text-center">{renderDocCell(row, DOC_SLOTS[1])}</TableCell>
                  <TableCell className="text-center">{renderDocCell(row, DOC_SLOTS[2])}</TableCell>
                  <TableCell className="text-right">{renderEditableCell(row, "invoiced_amount", row.invoiced_amount != null ? String(row.invoiced_amount) : "0", "text-right")}</TableCell>
                  <TableCell className="text-right">{renderEditableCell(row, "cbm", row.cbm != null ? String(row.cbm) : "", "text-right")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
