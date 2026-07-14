"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, FileText, Download, X, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { DeliveryNote, DeliveryNoteItem } from "@/types";

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md " +
  "bg-white dark:bg-[#0d1a35] text-gray-900 dark:text-white " +
  "placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#071A3A] dark:focus:ring-[#E67A32]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-[#071A3A] dark:text-gray-300 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const emptyItem = (): DeliveryNoteItem => ({
  item_description: "", qty: "", unit: "", total_pallets: "", remark: "",
});

interface EmptyForm {
  doc_number: string;
  doc_date: string;
  job_number: string;
  shipper: string;
  ref_number: string;
  destination: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
  receiver_name: string;
  received_date: string;
}

function toForm(dn: DeliveryNote | null): EmptyForm {
  return {
    doc_number: dn?.doc_number || "",
    doc_date: dn?.doc_date?.slice(0, 10) || "",
    job_number: dn?.job_number || "",
    shipper: dn?.shipper || "",
    ref_number: dn?.ref_number || "",
    destination: dn?.destination || "",
    customer_name: dn?.customer_name || "",
    customer_address: dn?.customer_address || "",
    customer_phone: dn?.customer_phone || "",
    customer_email: dn?.customer_email || "",
    notes: dn?.notes || "",
    receiver_name: dn?.receiver_name || "",
    received_date: dn?.received_date?.slice(0, 10) || "",
  };
}

interface Props {
  collectionId: string;
  deliveryNote: DeliveryNote | null;
}

export function DeliveryNoteSection({ collectionId, deliveryNote }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [form, setForm] = useState<EmptyForm>(toForm(deliveryNote));
  const [items, setItems] = useState<DeliveryNoteItem[]>(
    deliveryNote?.items?.length ? deliveryNote.items : [emptyItem()]
  );

  function set(k: keyof EmptyForm, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function setItem(i: number, k: keyof DeliveryNoteItem, v: string) {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  }

  function addItem() {
    setItems((p) => [...p, emptyItem()]);
  }

  function removeItem(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }

  function startEdit() {
    setForm(toForm(deliveryNote));
    setItems(deliveryNote?.items?.length ? [...deliveryNote.items] : [emptyItem()]);
    setEditing(true);
  }

  function cancelEdit() {
    setForm(toForm(deliveryNote));
    setItems(deliveryNote?.items?.length ? [...deliveryNote.items] : [emptyItem()]);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, items };
      const res = await fetch(`/api/collections/${collectionId}/delivery-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save delivery note");
      toast.success("Delivery note saved");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to save delivery note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/delivery-note`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Delivery note removed");
      setDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to remove delivery note");
    } finally {
      setDeleting(false);
    }
  }

  function handlePrint() {
    window.open(`/api/collections/${collectionId}/delivery-note/pdf`, "_blank");
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = `/api/collections/${collectionId}/delivery-note/pdf?download=1`;
    a.download = `Delivery Note - ${deliveryNote?.customer_name || "Receipt"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── "Add Delivery Note" button shown when none exists and not editing ──
  if (!deliveryNote && !editing) {
    return (
      <Card className="border-none shadow-sm mt-4">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#071A3A] dark:text-white">Delivery Note</p>
            <p className="text-xs text-muted-foreground mt-0.5">No delivery note attached to this collection</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-[#071A3A] text-[#071A3A] hover:bg-[#071A3A] hover:text-white dark:border-white dark:text-white transition-colors"
            onClick={() => setEditing(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Delivery Note
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Edit / Create form ──
  if (editing) {
    return (
      <Card className="border-none shadow-sm mt-4">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">
            {deliveryNote ? "Edit Delivery Note" : "Add Delivery Note"}
          </CardTitle>
          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Header fields */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#071A3A] dark:text-white mb-2 pb-1 border-b border-gray-100 dark:border-gray-800">
              Document Info
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <Field label="Doc Number">
                <input className={inputCls} value={form.doc_number} onChange={e => set("doc_number", e.target.value)} placeholder="DLO-YSI-26-0001" />
              </Field>
              <Field label="Date">
                <input className={inputCls} type="date" value={form.doc_date} onChange={e => set("doc_date", e.target.value)} />
              </Field>
              <Field label="Job Number">
                <input className={inputCls} value={form.job_number} onChange={e => set("job_number", e.target.value)} placeholder="YSIKSA009/LTL" />
              </Field>
              <Field label="Shipper">
                <input className={inputCls} value={form.shipper} onChange={e => set("shipper", e.target.value)} placeholder="Shipper name" />
              </Field>
              <Field label="Ref">
                <input className={inputCls} value={form.ref_number} onChange={e => set("ref_number", e.target.value)} placeholder="Ref. no." />
              </Field>
              <Field label="Destination">
                <input className={inputCls} value={form.destination} onChange={e => set("destination", e.target.value)} placeholder="DAMMAM" />
              </Field>
            </div>
          </div>

          {/* Customer block */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#071A3A] dark:text-white mb-2 pb-1 border-b border-gray-100 dark:border-gray-800">
              Customer Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Customer Name">
                <input className={inputCls} value={form.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="M/s. Company Name" />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} placeholder="+966 50 120 3503" />
              </Field>
              <Field label="Address">
                <textarea className={inputCls} rows={2} value={form.customer_address} onChange={e => set("customer_address", e.target.value)} placeholder="Street, City, Country" />
              </Field>
              <Field label="Email">
                <input className={inputCls} value={form.customer_email} onChange={e => set("customer_email", e.target.value)} placeholder="contact@company.com" />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Remarks / Notes">
                <textarea className={inputCls} rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes or remarks" />
              </Field>
            </div>
          </div>

          {/* Items table */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#071A3A] dark:text-white mb-2 pb-1 border-b border-gray-100 dark:border-gray-800">
              Items
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#071A3A]/40">
                    <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200 w-8">#</th>
                    <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200">Item Description</th>
                    <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-16">QTY</th>
                    <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-16">UNIT</th>
                    <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-20">PALLETS</th>
                    <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200 w-28">Remark</th>
                    <th className="border border-gray-200 dark:border-gray-700 px-1 py-1.5 w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center text-muted-foreground">{i + 1}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                        <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded" value={it.item_description} onChange={e => setItem(i, "item_description", e.target.value)} placeholder="Description" />
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                        <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded text-center" value={String(it.qty)} onChange={e => setItem(i, "qty", e.target.value)} placeholder="1" />
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                        <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded text-center" value={it.unit} onChange={e => setItem(i, "unit", e.target.value)} placeholder="NOS" />
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                        <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded text-center" value={String(it.total_pallets)} onChange={e => setItem(i, "total_pallets", e.target.value)} placeholder="1" />
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 p-0.5">
                        <input className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:ring-1 focus:ring-[#071A3A] rounded" value={it.remark} onChange={e => setItem(i, "remark", e.target.value)} placeholder="Remark" />
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-1 py-1 text-center">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5 h-7 text-xs" onClick={addItem}>
              <Plus className="h-3 w-3" />
              Add Row
            </Button>
          </div>

          {/* Receiver block */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#071A3A] dark:text-white mb-2 pb-1 border-b border-gray-100 dark:border-gray-800">
              Receiver Sign-off
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Receiver Name">
                <input className={inputCls} value={form.receiver_name} onChange={e => set("receiver_name", e.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Received Date">
                <input className={inputCls} type="date" value={form.received_date} onChange={e => set("received_date", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-[#E67A32] hover:bg-[#d06820] text-white"
              size="sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : "Save Delivery Note"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── View mode ──
  const dn = deliveryNote!;

  return (
    <>
      <Card className="border-none shadow-sm mt-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-[#071A3A] dark:text-white">Delivery Note</CardTitle>
              {dn.doc_number && (
                <span className="text-xs font-mono text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {dn.doc_number}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handlePrint}>
                <FileText className="h-3 w-3" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleDownload}>
                <Download className="h-3 w-3" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={startEdit}>
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <button
                className="text-muted-foreground hover:text-foreground ml-1"
                onClick={() => setCollapsed(c => !c)}
              >
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardHeader>

        {!collapsed && (
          <CardContent className="pt-0 space-y-4">
            {/* Customer + Doc Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Customer</p>
                <p className="text-sm font-semibold text-[#071A3A] dark:text-white">{dn.customer_name || "—"}</p>
                {dn.customer_address && <p className="text-xs text-muted-foreground whitespace-pre-line mt-0.5">{dn.customer_address}</p>}
                {dn.customer_phone && <p className="text-xs text-muted-foreground mt-0.5">Tel: {dn.customer_phone}</p>}
                {dn.customer_email && <p className="text-xs text-muted-foreground">{dn.customer_email}</p>}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  ["Date", dn.doc_date ? new Date(dn.doc_date).toLocaleDateString("en-GB") : null],
                  ["Job", dn.job_number],
                  ["Shipper", dn.shipper],
                  ["Ref", dn.ref_number],
                  ["Destination", dn.destination],
                ].map(([label, val]) => val ? (
                  <div key={label as string}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{val}</p>
                  </div>
                ) : null)}
              </div>
            </div>

            {dn.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Remarks</p>
                <p className="text-sm text-muted-foreground">{dn.notes}</p>
              </div>
            )}

            {/* Items */}
            {dn.items?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Items</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse min-w-[480px]">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#071A3A]/40">
                        <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200 w-8">#</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200">Item Description</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-16">QTY</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-16">UNIT</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center font-semibold text-[#071A3A] dark:text-gray-200 w-20">PALLETS</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-left font-semibold text-[#071A3A] dark:text-gray-200">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dn.items.map((it, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#071A3A]/20">
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center text-muted-foreground">{i + 1}</td>
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5">{it.item_description || "—"}</td>
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">{it.qty || "—"}</td>
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">{it.unit || "—"}</td>
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">{it.total_pallets || "—"}</td>
                          <td className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-muted-foreground">{it.remark || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Receiver */}
            {(dn.receiver_name || dn.received_date) && (
              <div className="flex gap-6">
                {dn.receiver_name && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receiver</p>
                    <p className="text-sm font-medium">{dn.receiver_name}</p>
                  </div>
                )}
                {dn.received_date && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Received Date</p>
                    <p className="text-sm font-medium">{new Date(dn.received_date).toLocaleDateString("en-GB")}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Delivery Note</DialogTitle>
            <DialogDescription>
              This will permanently delete the delivery note for this collection. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
