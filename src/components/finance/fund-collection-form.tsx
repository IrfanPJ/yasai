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

export function FundCollectionForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_name: initial?.customer_name ?? "",
    amount: initial?.amount?.toString() ?? "",
    currency: initial?.currency ?? "AED",
    payment_mode: initial?.payment_mode ?? "cash",
    collection_date: initial?.collection_date ?? new Date().toISOString().slice(0, 10),
    transfer_rate: initial?.transfer_rate?.toString() ?? "",
    bank_reference: initial?.bank_reference ?? "",
    destination_account: initial?.destination_account ?? "",
    notes: initial?.notes ?? "",
  });

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.amount || !form.collection_date) {
      toast.error("Fill in required fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        transfer_rate: form.transfer_rate ? parseFloat(form.transfer_rate) : undefined,
      };
      const url = isEdit ? `/api/fund-collections/${initial!.id}` : "/api/fund-collections";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Collection Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Customer Name <span className="text-red-500">*</span></Label>
            <Input value={form.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="Customer or company name" />
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
          <div className="space-y-1.5">
            <Label>Payment Mode <span className="text-red-500">*</span></Label>
            <Select value={form.payment_mode} onValueChange={v => set("payment_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Collection Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={form.collection_date} onChange={e => set("collection_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Transfer Rate</Label>
            <Input type="number" step="0.0001" value={form.transfer_rate} onChange={e => set("transfer_rate", e.target.value)} placeholder="e.g. 0.1020" />
          </div>
          {form.payment_mode === "bank_transfer" && (
            <>
              <div className="space-y-1.5">
                <Label>Bank Reference</Label>
                <Input value={form.bank_reference} onChange={e => set("bank_reference", e.target.value)} placeholder="Transaction reference" />
              </div>
              <div className="space-y-1.5">
                <Label>Destination Account</Label>
                <Input value={form.destination_account} onChange={e => set("destination_account", e.target.value)} placeholder="Account number / IBAN" />
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
          {isEdit ? "Save Changes" : "Record Collection"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
