"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordPicker, type PickerOption } from "./record-picker";

interface Props { fundTransferId?: string }

export function BackupDocForm({ fundTransferId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [transferOptions, setTransferOptions] = useState<PickerOption[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);

  useEffect(() => {
    fetch("/api/fund-transfers")
      .then(r => r.json())
      .then((rows: { id: string; transfer_number: string; amount: number; currency: string; status: string; source_region: string; destination_region: string }[]) => {
        setTransferOptions(rows.map(t => ({
          value: t.id,
          label: t.transfer_number,
          sublabel: `${t.source_region} → ${t.destination_region} · ${t.currency} ${Number(t.amount).toLocaleString()}`,
          badge: t.status.replace("_", " "),
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingTransfers(false));
  }, []);

  const [form, setForm] = useState({
    fund_transfer_id: fundTransferId ?? "",
    doc_type: "pi",
    supplier_name: "",
    amount: "",
    currency: "AED",
    notes: "",
  });

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplier_name || !form.amount) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await fetch("/api/backup-docs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Backup document created");
      router.push("/finance/backup-docs");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Backup Document</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Linked Fund Transfer <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
            <RecordPicker
              options={transferOptions}
              value={form.fund_transfer_id}
              onChange={v => set("fund_transfer_id", v)}
              placeholder="Search and select a transfer…"
              loading={loadingTransfers}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Document Type <span className="text-red-500">*</span></Label>
            <Select value={form.doc_type} onValueChange={v => set("doc_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pi">PI (Proforma Invoice)</SelectItem>
                <SelectItem value="po">PO (Purchase Order)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1 space-y-1.5">
            <Label>Supplier Name <span className="text-red-500">*</span></Label>
            <Input value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} placeholder="Supplier / company" />
          </div>
          <div className="space-y-1.5">
            <Label>Amount <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => set("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Document
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
