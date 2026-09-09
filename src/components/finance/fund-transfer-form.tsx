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
import type { FundTransfer } from "@/types";

interface Props { initial?: FundTransfer; fundCollectionId?: string }

export function FundTransferForm({ initial, fundCollectionId }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);
  const [collectionOptions, setCollectionOptions] = useState<PickerOption[]>([]);
  const [collectionMeta, setCollectionMeta] = useState<Map<string, { amount: number; currency: string; transfer_rate?: number }>>(new Map());
  const [loadingCollections, setLoadingCollections] = useState(true);

  useEffect(() => {
    fetch("/api/fund-collections")
      .then(r => r.json())
      .then((rows: { id: string; collection_number: string; customer_name: string; amount: number; currency: string; status: string; transfer_rate?: number }[]) => {
        setCollectionOptions(rows.map(c => ({
          value: c.id,
          label: c.collection_number,
          sublabel: `${c.customer_name} · ${c.currency} ${Number(c.amount).toLocaleString()}`,
          badge: c.status,
        })));
        setCollectionMeta(new Map(rows.map(c => [c.id, { amount: c.amount, currency: c.currency, transfer_rate: c.transfer_rate }])));
      })
      .catch(() => {})
      .finally(() => setLoadingCollections(false));
  }, []);

  const [form, setForm] = useState({
    fund_collection_id: initial?.fund_collection_id ?? fundCollectionId ?? "",
    transfer_mode: initial?.transfer_mode ?? "bank_transfer",
    amount: initial?.amount?.toString() ?? "",
    currency: initial?.currency ?? "AED",
    source_region: initial?.source_region ?? "UAE",
    destination_region: initial?.destination_region ?? "KSA",
    third_party_name: initial?.third_party_name ?? "",
    third_party_location: initial?.third_party_location ?? "",
    destination_bank_account: initial?.destination_bank_account ?? "",
    bank_reference: initial?.bank_reference ?? "",
    notes: initial?.notes ?? "",
  });

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleCollectionChange(v: string) {
    const meta = collectionMeta.get(v);
    setForm(p => ({
      ...p,
      fund_collection_id: v,
      ...(meta && !p.amount ? { amount: meta.amount.toString(), currency: meta.currency } : {}),
    }));
  }

  const selectedMeta = collectionMeta.get(form.fund_collection_id);
  const expectedDestAmount = selectedMeta?.transfer_rate && form.amount
    ? (parseFloat(form.amount) * selectedMeta.transfer_rate).toFixed(2)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.transfer_mode) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const url = isEdit ? `/api/fund-transfers/${initial!.id}` : "/api/fund-transfers";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast.success(isEdit ? "Updated" : "Transfer initiated");
      router.push(`/finance/transfers/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Transfer Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Linked Fund Collection <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
            <RecordPicker
              options={collectionOptions}
              value={form.fund_collection_id}
              onChange={handleCollectionChange}
              placeholder="Search and select a collection…"
              loading={loadingCollections}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Amount <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
            {expectedDestAmount && (
              <p className="text-xs text-muted-foreground">
                Expected at destination: ~{Number(expectedDestAmount).toLocaleString()} (rate {selectedMeta?.transfer_rate})
              </p>
            )}
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
          <div className="space-y-1.5">
            <Label>Transfer Mode <span className="text-red-500">*</span></Label>
            <Select value={form.transfer_mode} onValueChange={v => set("transfer_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash_third_party">Cash via 3rd Party</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source Region</Label>
            <Input value={form.source_region} onChange={e => set("source_region", e.target.value)} placeholder="UAE" />
          </div>
          <div className="space-y-1.5">
            <Label>Destination Region</Label>
            <Input value={form.destination_region} onChange={e => set("destination_region", e.target.value)} placeholder="KSA" />
          </div>
          {form.transfer_mode === "bank_transfer" ? (
            <>
              <div className="space-y-1.5">
                <Label>Destination Bank Account</Label>
                <Input value={form.destination_bank_account} onChange={e => set("destination_bank_account", e.target.value)} placeholder="IBAN / Account no." />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Reference</Label>
                <Input value={form.bank_reference} onChange={e => set("bank_reference", e.target.value)} placeholder="Transaction reference" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>3rd Party Name</Label>
                <Input value={form.third_party_name} onChange={e => set("third_party_name", e.target.value)} placeholder="Agent / person name" />
              </div>
              <div className="space-y-1.5">
                <Label>Collection Location</Label>
                <Input value={form.third_party_location} onChange={e => set("third_party_location", e.target.value)} placeholder="Office / area" />
              </div>
            </>
          )}
          <div className="md:col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Initiate Transfer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
