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
import { BankPicker } from "./bank-picker";
import { AccountPicker } from "./account-picker";
import { CURRENCIES } from "@/lib/currencies";
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
    currency: initial?.currency ?? "SAR",
    destination_currency: initial?.destination_currency ?? "AED",
    transfer_rate: initial?.transfer_rate?.toString() ?? "",
    source_account_id: initial?.source_account_id ?? "",
    destination_account_id: initial?.destination_account_id ?? "",
    source_region: initial?.source_region ?? "UAE",
    destination_region: initial?.destination_region ?? "KSA",
    third_party_name: initial?.third_party_name ?? "",
    third_party_location: initial?.third_party_location ?? "",
    bank_profile_id: initial?.bank_profile_id ?? "",
    bank_name: initial?.bank_name ?? "",
    destination_bank_account: initial?.destination_bank_account ?? "",
    bank_account_holder: initial?.bank_account_holder ?? "",
    swift_code: initial?.swift_code ?? "",
    bank_reference: initial?.bank_reference ?? "",
    notes: initial?.notes ?? "",
  });

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function applyBank(bank: { id: string; bank_name: string; account_holder?: string; account_number?: string; swift_code?: string } | null) {
    setForm(p => ({
      ...p,
      bank_profile_id: bank?.id ?? "",
      bank_name: bank?.bank_name ?? p.bank_name,
      destination_bank_account: bank?.account_number ?? p.destination_bank_account,
      bank_account_holder: bank?.account_holder ?? p.bank_account_holder,
      swift_code: bank?.swift_code ?? p.swift_code,
    }));
  }

  function handleCollectionChange(v: string) {
    const meta = collectionMeta.get(v);
    setForm(p => ({
      ...p,
      fund_collection_id: v,
      ...(meta && !p.amount ? { amount: meta.amount.toString(), currency: meta.currency } : {}),
    }));
  }

  const needsRate = form.currency !== form.destination_currency;
  const equiv = needsRate && form.amount && form.transfer_rate
    ? (parseFloat(form.amount) * parseFloat(form.transfer_rate)).toLocaleString("en", { maximumFractionDigits: 2 })
    : null;

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
            <Label>Source Currency</Label>
            <Select value={form.currency} onValueChange={v => set("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Destination Currency</Label>
            <Select value={form.destination_currency} onValueChange={v => set("destination_currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsRate && (
            <div className="md:col-span-2 space-y-1.5">
              <Label>
                Exchange Rate
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  1 {form.currency} = ? {form.destination_currency}
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" step="0.0001"
                  value={form.transfer_rate}
                  onChange={e => set("transfer_rate", e.target.value)}
                  placeholder="e.g. 1.0200"
                  className="max-w-xs"
                />
                {equiv && (
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    ≈ <strong className="text-foreground">{form.destination_currency} {equiv}</strong>
                  </p>
                )}
              </div>
            </div>
          )}
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
          <div className="space-y-1.5">
            <Label>Source Account <span className="text-xs font-normal text-muted-foreground">(money leaves)</span></Label>
            <AccountPicker value={form.source_account_id} onChange={v => set("source_account_id", v)} currency={form.currency} />
          </div>
          <div className="space-y-1.5">
            <Label>Destination Account <span className="text-xs font-normal text-muted-foreground">(if it is one of yours)</span></Label>
            <AccountPicker value={form.destination_account_id} onChange={v => set("destination_account_id", v)} currency={form.destination_currency} />
          </div>
          {form.transfer_mode === "bank_transfer" ? (
            <>
              <div className="md:col-span-2 space-y-1.5">
                <Label>Saved Bank</Label>
                <BankPicker selectedId={form.bank_profile_id} currency={form.destination_currency} onSelect={applyBank} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input
                  value={form.bank_name}
                  onChange={e => { set("bank_name", e.target.value); set("bank_profile_id", ""); }}
                  placeholder="e.g. Emirates NBD, Al Rajhi"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Holder</Label>
                <Input value={form.bank_account_holder} onChange={e => set("bank_account_holder", e.target.value)} placeholder="Name on the account" />
              </div>
              <div className="space-y-1.5">
                <Label>Destination Bank Account</Label>
                <Input value={form.destination_bank_account} onChange={e => set("destination_bank_account", e.target.value)} placeholder="IBAN / Account no." />
              </div>
              <div className="space-y-1.5">
                <Label>SWIFT / BIC Code</Label>
                <Input value={form.swift_code} onChange={e => set("swift_code", e.target.value)} placeholder="e.g. EBILAEAD" />
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
