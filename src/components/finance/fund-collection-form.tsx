"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FundCollection } from "@/types";

interface Props { initial?: FundCollection }

const CURRENCIES = ["AED", "SAR", "USD", "EUR", "GBP", "OMR", "KWD", "BHD", "QAR"];

export function FundCollectionForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_name:    initial?.customer_name    ?? "",
    customer_phone:   initial?.customer_phone   ?? "",
    amount:           initial?.amount?.toString() ?? "",
    currency:         initial?.currency          ?? "AED",
    payment_mode:     initial?.payment_mode      ?? "cash",
    collection_date:  initial?.collection_date   ?? new Date().toISOString().slice(0, 10),
    collected_by:     initial?.collected_by      ?? "",
    transfer_rate:    initial?.transfer_rate?.toString() ?? "",
    // Bank transfer fields
    bank_name:        initial?.bank_name         ?? "",
    bank_reference:   initial?.bank_reference    ?? "",
    iban:             initial?.iban              ?? "",
    // Cheque fields
    cheque_number:    initial?.cheque_number     ?? "",
    cheque_date:      initial?.cheque_date       ?? "",
    cheque_bank:      initial?.cheque_bank       ?? "",
    notes:            initial?.notes             ?? "",
  });

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const isForeign = form.currency !== "AED";
  const equiv = isForeign && form.amount && form.transfer_rate
    ? (parseFloat(form.amount) * parseFloat(form.transfer_rate)).toLocaleString("en", { maximumFractionDigits: 2 })
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.amount || !form.collection_date) {
      toast.error("Fill in required fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_name:   form.customer_name,
        customer_phone:  form.customer_phone || null,
        amount:          parseFloat(form.amount),
        currency:        form.currency,
        payment_mode:    form.payment_mode,
        collection_date: form.collection_date,
        collected_by:    form.collected_by  || null,
        transfer_rate:   form.transfer_rate ? parseFloat(form.transfer_rate) : null,
        bank_name:       form.payment_mode === "bank_transfer" ? (form.bank_name || null)      : null,
        bank_reference:  form.payment_mode === "bank_transfer" ? (form.bank_reference || null)  : null,
        iban:            form.payment_mode === "bank_transfer" ? (form.iban || null)            : null,
        cheque_number:   form.payment_mode === "cheque" ? (form.cheque_number || null)          : null,
        cheque_date:     form.payment_mode === "cheque" ? (form.cheque_date || null)            : null,
        cheque_bank:     form.payment_mode === "cheque" ? (form.cheque_bank || null)            : null,
        notes:           form.notes || null,
      };
      const url    = isEdit ? `/api/fund-collections/${initial!.id}` : "/api/fund-collections";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast.success(isEdit ? "Updated" : "Collection recorded");
      router.push(`/finance/collections/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

      {/* ── Customer ─────────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Customer / Company Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.customer_name}
              onChange={e => set("customer_name", e.target.value)}
              placeholder="Customer or company name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={form.customer_phone}
              onChange={e => set("customer_phone", e.target.value)}
              placeholder="+971 50 000 0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Received By</Label>
            <Input
              value={form.collected_by}
              onChange={e => set("collected_by", e.target.value)}
              placeholder="Staff member who collected"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Payment Details ──────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Amount <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={e => set("amount", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => set("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Mode <span className="text-red-500">*</span></Label>
            <Select value={form.payment_mode} onValueChange={v => set("payment_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Collection Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={form.collection_date}
              onChange={e => set("collection_date", e.target.value)}
            />
          </div>

          {isForeign && (
            <div className="md:col-span-2 space-y-1.5">
              <Label>
                Exchange Rate
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  1 {form.currency} = ? AED
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.0001"
                  value={form.transfer_rate}
                  onChange={e => set("transfer_rate", e.target.value)}
                  placeholder="e.g. 1.0200"
                  className="max-w-xs"
                />
                {equiv && (
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    ≈ <strong className="text-foreground">AED {equiv}</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bank Transfer Details ─────────────────────────────── */}
      {form.payment_mode === "bank_transfer" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input
                value={form.bank_name}
                onChange={e => set("bank_name", e.target.value)}
                placeholder="e.g. Emirates NBD, Al Rajhi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Transaction Reference</Label>
              <Input
                value={form.bank_reference}
                onChange={e => set("bank_reference", e.target.value)}
                placeholder="Bank transaction reference"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>IBAN / Account Number</Label>
              <Input
                value={form.iban}
                onChange={e => set("iban", e.target.value)}
                placeholder="AE00 0000 0000 0000 0000 000"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Cheque Details ────────────────────────────────────── */}
      {form.payment_mode === "cheque" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Cheque Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cheque Number</Label>
              <Input
                value={form.cheque_number}
                onChange={e => set("cheque_number", e.target.value)}
                placeholder="Cheque number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cheque Date</Label>
              <Input
                type="date"
                value={form.cheque_date}
                onChange={e => set("cheque_date", e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Issuing Bank</Label>
              <Input
                value={form.cheque_bank}
                onChange={e => set("cheque_bank", e.target.value)}
                placeholder="Bank on the cheque"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Notes ─────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-4 space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Any additional remarks" />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Record Collection"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
