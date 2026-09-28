"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Trash2, CheckCircle2, ExternalLink, Loader2, Undo2, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import type { ConsolidationSheet, ConsolidationSheetItem, ConsolidationSheetRemoval, UserRole } from "@/types";
import { CONSOLIDATION_CBM_LIMIT, CONSOLIDATION_PALLET_LIMIT } from "@/types";

interface Props {
  sheet: ConsolidationSheet;
  items: ConsolidationSheetItem[];
  userRole: UserRole;
  restorableRemovals?: ConsolidationSheetRemoval[];
  elsewhereQueuedCount?: number;
}

const EDIT_ROLES: UserRole[] = ["admin", "operations", "warehouse", "warehouse_supervisor"];

type EditableGcnField =
  | "consignee_name" | "shipper_name" | "destination"
  | "weight_kg" | "volume_cbm" | "doc_ref_number" | "shipping_mark" | "num_packages";

const GCN_COLUMNS: { key: EditableGcnField; label: string; width: string; type?: string }[] = [
  { key: "consignee_name", label: "Customer", width: "160px" },
  { key: "shipper_name", label: "Supplier", width: "160px" },
  { key: "destination", label: "Delivery Place", width: "140px" },
  { key: "weight_kg", label: "Weight (Kg)", width: "100px", type: "number" },
  { key: "volume_cbm", label: "CBM", width: "90px", type: "number" },
  { key: "doc_ref_number", label: "Ref", width: "130px" },
  { key: "shipping_mark", label: "Shipping Mark", width: "110px" },
  { key: "num_packages", label: "Packages", width: "120px" },
];

const cellCls = "w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded";

export function ManifestSheetDetail({ sheet, items: initialItems, userRole, restorableRemovals: initialRemovals, elsewhereQueuedCount = 0 }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [removals, setRemovals] = useState(initialRemovals || []);
  const [converting, setConverting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const canEdit = sheet.status === "pending" && EDIT_ROLES.includes(userRole);
  const totalPallets = items.reduce((s, it) => s + (it.pallet_count || 0), 0);
  const totalCbm = items.reduce((s, it) => s + (it.cbm || 0), 0);

  function updateLocal(itemId: string, patch: Partial<ConsolidationSheetItem> & { gcn?: Partial<NonNullable<ConsolidationSheetItem["gcn"]>> }) {
    setItems((prev) => prev.map((it) => {
      if (it.id !== itemId) return it;
      return { ...it, ...patch, gcn: patch.gcn ? { ...it.gcn!, ...patch.gcn } : it.gcn };
    }));
  }

  async function saveGcnField(itemId: string, gcnId: string, field: string, value: string) {
    const parsed = (field === "weight_kg" || field === "volume_cbm") ? (value === "" ? null : Number(value)) : value;
    updateLocal(itemId, { gcn: { [field]: parsed } as never });
    try {
      const res = await fetch(`/api/collections/${gcnId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save");
    }
  }

  async function savePalletCount(itemId: string, value: string) {
    const parsed = Math.max(0, Number(value) || 0);
    updateLocal(itemId, { pallet_count: parsed });
    try {
      const res = await fetch(`/api/manifest/${sheet.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pallet_count: parsed }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Failed to save pallet count");
    }
  }

  async function saveCbm(itemId: string, value: string) {
    const parsed = Math.max(0, Number(value) || 0);
    updateLocal(itemId, { cbm: parsed });
    try {
      const res = await fetch(`/api/manifest/${sheet.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cbm: parsed }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Failed to save CBM");
    }
  }

  async function saveRemarks(itemId: string, value: string) {
    updateLocal(itemId, { remarks: value });
    try {
      const res = await fetch(`/api/manifest/${sheet.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save remarks");
    }
  }

  async function removeItem(item: ConsolidationSheetItem) {
    setRemovingId(item.id);
    try {
      const res = await fetch(`/api/manifest/${sheet.id}/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      const { removal_id } = await res.json();
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      if (removal_id) {
        setRemovals((prev) => [
          {
            id: removal_id,
            zone: sheet.zone,
            gcn_id: item.gcn_id,
            original_sheet_id: sheet.id,
            original_position: item.position,
            pallet_count: item.pallet_count,
            cbm: item.cbm,
            remarks: item.remarks,
            removed_at: new Date().toISOString(),
            gcn: item.gcn,
          },
          ...prev,
        ]);
      }
      toast.success("Removed — will join the next pending sheet for this zone", {
        action: removal_id ? {
          label: "Undo",
          onClick: () => undoRemoval(removal_id),
        } : undefined,
        duration: 8000,
      });
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  async function undoRemoval(removalId: string) {
    setRestoringId(removalId);
    try {
      const res = await fetch(`/api/manifest/removals/${removalId}/restore`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      // Local `items` state won't pick up a router.refresh() on its own (it's
      // only seeded from props on first mount) — re-fetch this sheet directly
      // so the restored row actually reappears in the grid.
      const fresh = await fetch(`/api/manifest/${sheet.id}`).then((r) => r.json());
      setItems(fresh.items || []);
      setRemovals((prev) => prev.filter((r) => r.id !== removalId));
      toast.success("Restored to this sheet");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to undo — it may already be on a newer sheet");
    } finally {
      setRestoringId(null);
    }
  }

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/manifest/${sheet.id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Converted to manifest — Job Order created");
      setConvertOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Actions bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={sheet.status === "manifest" ? "navy" : "outline"}>
          {sheet.status === "manifest" ? "Manifest" : "Pending"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {items.length} GCNs &middot; {totalPallets} / {CONSOLIDATION_PALLET_LIMIT} pallets &middot; {totalCbm.toFixed(3)} / {CONSOLIDATION_CBM_LIMIT} CBM
        </span>

        <div className="ml-auto flex items-center gap-2">
          {sheet.job_order_id && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={`/jobs/${sheet.job_order_id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                View Job Order
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={`/api/manifest/${sheet.id}/export/excel`}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={`/api/manifest/${sheet.id}/export/pdf?download=1`}>
              <FileText className="h-3.5 w-3.5" />
              <Download className="h-3 w-3" />
              PDF
            </a>
          </Button>
          {canEdit && items.length > 0 && (
            <>
              <Button size="sm" className="gap-1.5 bg-[#E67A32] hover:bg-[#d06820]" onClick={() => setConvertOpen(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Convert to Manifest
              </Button>
              <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convert to Manifest?</DialogTitle>
                    <DialogDescription>
                      This finalizes {sheet.sheet_number} ({items.length} GCNs, {totalPallets} pallets, {totalCbm.toFixed(3)} CBM) as a
                      manifest and creates a Job Order pre-filled with these GCNs. No more items can be added or edited on this sheet afterward.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConvertOpen(false)} disabled={converting}>Cancel</Button>
                    <Button onClick={handleConvert} disabled={converting} className="gap-1.5 bg-[#E67A32] hover:bg-[#d06820]">
                      {converting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Convert
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* ── Removed from this sheet — undo/restore inline ── */}
      {canEdit && (removals.length > 0 || elsewhereQueuedCount > 0) && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-3 space-y-2">
          {removals.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Removed from this sheet — restore if it shouldn&apos;t have left
              </p>
              <div className="space-y-1">
                {removals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 bg-white dark:bg-[#0d1a35] rounded-md px-3 py-1.5 border border-amber-100 dark:border-amber-900/40">
                    <div className="min-w-0 flex-1 text-xs">
                      <Link href={`/collections/${r.gcn_id}`} className="font-medium text-[#071A3A] dark:text-orange-300 hover:underline">
                        {r.gcn?.collection_number}
                      </Link>
                      <span className="text-muted-foreground"> &middot; {r.gcn?.consignee_name} &middot; {r.pallet_count} plt, {Number(r.cbm).toFixed(3)} CBM &middot; removed {formatDateTime(r.removed_at)}</span>
                    </div>
                    <Button
                      size="sm" variant="outline" className="gap-1.5 shrink-0 h-7"
                      disabled={restoringId === r.id}
                      onClick={() => undoRemoval(r.id)}
                    >
                      {restoringId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
          {elsewhereQueuedCount > 0 && (
            <p className="text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {elsewhereQueuedCount} more GCN{elsewhereQueuedCount === 1 ? "" : "s"} removed from an earlier {sheet.zone === "jafza" ? "JAFZA" : "Mainland"} sheet {elsewhereQueuedCount === 1 ? "is" : "are"} still waiting for the next one —
              {" "}<Link href="/manifest/history" className="underline hover:no-underline inline-flex items-center gap-0.5">see history <History className="h-3 w-3" /></Link>
            </p>
          )}
        </div>
      )}

      {/* ── Editable grid ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#0d1a35]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#071A3A]/40">
                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-10">#</th>
                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200 w-24">GCN</th>
                {GCN_COLUMNS.map((c) => (
                  <th key={c.key} style={{ width: c.width }} className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200">
                    {c.label}
                  </th>
                ))}
                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-20">Pallets</th>
                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-24">Sheet CBM</th>
                <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200 w-36">Remarks</th>
                {canEdit && <th className="border border-gray-200 dark:border-gray-700 w-8" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center text-muted-foreground">{i + 1}</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                    <Link href={`/collections/${item.gcn_id}`} className="text-[#071A3A] dark:text-orange-300 font-medium hover:underline">
                      {item.gcn?.collection_number}
                    </Link>
                  </td>
                  {GCN_COLUMNS.map((c) => (
                    <td key={c.key} className="border border-gray-200 dark:border-gray-700 p-0.5">
                      {canEdit ? (
                        <input
                          type={c.type || "text"}
                          step={c.type === "number" ? "0.01" : undefined}
                          className={cellCls}
                          defaultValue={(item.gcn?.[c.key] as string | number | undefined) ?? ""}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const original = (item.gcn?.[c.key] as string | number | undefined) ?? "";
                            if (String(val) !== String(original)) saveGcnField(item.id, item.gcn_id, c.key, val);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        />
                      ) : (
                        <span className="block px-1.5 py-1">{item.gcn?.[c.key] ?? "—"}</span>
                      )}
                    </td>
                  ))}
                  <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                    {canEdit ? (
                      <input
                        type="number"
                        min="0"
                        className={cn(cellCls, "text-center")}
                        defaultValue={item.pallet_count}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== item.pallet_count) savePalletCount(item.id, e.target.value);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <span className="block px-1.5 py-1 text-center">{item.pallet_count}</span>
                    )}
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                    {canEdit ? (
                      <input
                        type="number"
                        min="0" step="0.001"
                        className={cn(cellCls, "text-center")}
                        defaultValue={item.cbm}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== item.cbm) saveCbm(item.id, e.target.value);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <span className="block px-1.5 py-1 text-center">{item.cbm.toFixed(3)}</span>
                    )}
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                    {canEdit ? (
                      <input
                        className={cellCls}
                        defaultValue={item.remarks || ""}
                        placeholder="Remarks"
                        onBlur={(e) => {
                          if (e.target.value !== (item.remarks || "")) saveRemarks(item.id, e.target.value);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <span className="block px-1.5 py-1">{item.remarks || "—"}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="border border-gray-200 dark:border-gray-700 px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        disabled={removingId === item.id}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40"
                      >
                        {removingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={GCN_COLUMNS.length + 5} className="border border-gray-200 dark:border-gray-700 px-4 py-8 text-center text-muted-foreground">
                    No GCNs on this sheet yet.
                  </td>
                </tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-[#FFF7ED] dark:bg-[#071A3A]/60 font-semibold text-[#071A3A] dark:text-white">
                  <td colSpan={GCN_COLUMNS.length + 2} className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">
                    Total
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">{totalPallets} Pallets</td>
                  <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">{totalCbm.toFixed(3)} CBM</td>
                  <td className="border border-gray-200 dark:border-gray-700" colSpan={canEdit ? 2 : 1} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
