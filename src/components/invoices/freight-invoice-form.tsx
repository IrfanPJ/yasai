"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobOrder } from "@/types";

interface FreightLineItem {
  description: string;
  model_description: string;
  qty: number;
  country_of_origin: string;
  rate: number;
  vat_amount: number;
  amount: number;
}

const EMPTY_LINE: FreightLineItem = {
  description: "",
  model_description: "",
  qty: 1,
  country_of_origin: "",
  rate: 0,
  vat_amount: 0,
  amount: 0,
};

function toWords(n: number, currency = "SAR"): string {
  if (n === 0) return `${currency} : ZERO ONLY`;
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  function below1000(num: number): string {
    if (num === 0) return "";
    if (num < 20) return ones[num] + " ";
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "") + " ";
    return ones[Math.floor(num / 100)] + " HUNDRED " + below1000(num % 100);
  }
  const intPart = Math.floor(n);
  let result = "";
  if (intPart >= 1000) result += below1000(Math.floor(intPart / 1000)) + "THOUSAND ";
  result += below1000(intPart % 1000);
  return `${currency} : ${result.trim()} ONLY`;
}

export function FreightInvoiceForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [jobs, setJobs] = useState<JobOrder[]>([]);

  const [form, setForm] = useState({
    invoice_number: "",
    customer_name: "",
    customer_address: "",
    job_order_id: "none",
    port_of_loading: "Jebel Ali, UAE",
    packages_count: "",
    final_destination: "",
    currency: "SAR",
  });

  const [lines, setLines] = useState<FreightLineItem[]>([{ ...EMPTY_LINE, description: "LAND FREIGHT CHARGES (UAE to KSA)" }]);

  useEffect(() => {
    fetch("/api/jobs?limit=200")
      .then(r => r.json())
      .then(d => setJobs(d.data || d || []))
      .catch(() => {});
  }, []);

  function setF(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function updateLine(i: number, field: keyof FreightLineItem, value: string | number) {
    setLines(prev => {
      const next = [...prev];
      const item = { ...next[i], [field]: value };
      if (field === "qty" || field === "rate") {
        item.amount = Math.round(Number(item.qty) * Number(item.rate) * 100) / 100;
      }
      next[i] = item;
      return next;
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const totalVat = lines.reduce((s, l) => s + Number(l.vat_amount), 0);
  const total = subtotal + totalVat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.invoice_number.trim()) { toast.error("Invoice number is required"); return; }
    if (!form.customer_name.trim()) { toast.error("Customer name is required"); return; }
    if (lines.some(l => !l.description.trim())) { toast.error("All line items need a description"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_type: "freight",
          invoice_number: form.invoice_number.trim(),
          customer_name: form.customer_name.trim(),
          customer_address: form.customer_address || null,
          job_order_id: form.job_order_id === "none" ? null : form.job_order_id,
          currency: form.currency,
          port_of_loading: form.port_of_loading || null,
          packages_count: form.packages_count || null,
          final_destination: form.final_destination || null,
          tax_rate: 0,
          line_items: lines.map(l => ({
            description: l.description,
            model_description: l.model_description,
            qty: l.qty,
            country_of_origin: l.country_of_origin,
            unit_price: l.rate,
            vat_amount: l.vat_amount,
            amount: l.amount,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const inv = await res.json();
      toast.success(`Freight invoice ${inv.invoice_number} created`);
      router.push(`/invoices/${inv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      {/* Header info */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Invoice Number <span className="text-red-500">*</span></Label>
            <Input value={form.invoice_number} onChange={e => setF("invoice_number", e.target.value)} placeholder="e.g. 364 or YSI-KSA-364" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => setF("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["SAR", "AED", "USD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Customer Name <span className="text-red-500">*</span></Label>
            <Input value={form.customer_name} onChange={e => setF("customer_name", e.target.value)} placeholder="Customer or company name" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Customer Address</Label>
            <Textarea value={form.customer_address} onChange={e => setF("customer_address", e.target.value)} rows={2} placeholder="Billing address" />
          </div>
          <div className="space-y-1.5">
            <Label>Linked Job Order</Label>
            <Select value={form.job_order_id} onValueChange={v => setF("job_order_id", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.destination}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Line items — freight format */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Freight Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[2fr_1fr_80px_80px_80px_80px_32px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pb-1 border-b">
            <span>Description</span>
            <span>Country of Origin</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">VAT</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          {lines.map((line, i) => (
            <div key={i} className="space-y-1.5">
              <div className="grid grid-cols-[2fr_1fr_80px_80px_80px_80px_32px] gap-2 items-start">
                <div className="space-y-1">
                  <Input
                    value={line.description}
                    onChange={e => updateLine(i, "description", e.target.value)}
                    placeholder="Service description"
                    className="text-sm"
                  />
                  <Input
                    value={line.model_description}
                    onChange={e => updateLine(i, "model_description", e.target.value)}
                    placeholder="Model / sub-description (optional)"
                    className="text-xs text-muted-foreground h-7"
                  />
                </div>
                <Input
                  value={line.country_of_origin}
                  onChange={e => updateLine(i, "country_of_origin", e.target.value)}
                  placeholder="UAE"
                  className="text-sm"
                />
                <Input
                  type="number" min={1}
                  value={line.qty}
                  onChange={e => updateLine(i, "qty", Number(e.target.value))}
                  className="text-sm text-center"
                />
                <Input
                  type="number" min={0} step={0.01}
                  value={line.rate}
                  onChange={e => updateLine(i, "rate", Number(e.target.value))}
                  className="text-sm text-right"
                />
                <Input
                  type="number" min={0} step={0.01}
                  value={line.vat_amount}
                  onChange={e => updateLine(i, "vat_amount", Number(e.target.value))}
                  className="text-sm text-right"
                />
                <div className="text-sm font-medium text-right pt-2 pr-1 font-mono">
                  {Number(line.amount).toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-red-500 pt-2"
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <Button
            type="button" variant="outline" size="sm" className="gap-1.5"
            onClick={() => setLines(prev => [...prev, { ...EMPTY_LINE }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>

          {/* Totals — matches Excel layout */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <p className="text-xs text-muted-foreground italic mb-2">{toWords(total, form.currency)}</p>
            <div className="flex justify-end gap-8">
              <div className="space-y-1 text-right">
                <div className="flex justify-between gap-12">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-12">
                  <span className="text-muted-foreground">VAT</span>
                  <span className="font-mono">{totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-12 font-bold border-t pt-1">
                  <span>Total {form.currency}</span>
                  <span className="font-mono">{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping details */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Shipping Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Port of Loading</Label>
            <Input value={form.port_of_loading} onChange={e => setF("port_of_loading", e.target.value)} placeholder="Jebel Ali, UAE" />
          </div>
          <div className="space-y-1.5">
            <Label>Packages</Label>
            <Input value={form.packages_count} onChange={e => setF("packages_count", e.target.value)} placeholder="e.g. 1 Cartons" />
          </div>
          <div className="space-y-1.5">
            <Label>Final Place of Delivery</Label>
            <Input value={form.final_destination} onChange={e => setF("final_destination", e.target.value)} placeholder="Riyadh, KSA" />
          </div>
        </CardContent>
      </Card>

      {/* Bank details (read-only, for reference) */}
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Our Bank Details (printed on invoice)</p>
          <div className="text-xs text-muted-foreground space-y-0.5 font-mono">
            <p>A/c No: 6820 63417 42000</p>
            <p>IBAN: SA 410 50000 6820 63417 42000</p>
            <p>A/c Name: Altaawn Aldhhbyt Altjaryt Company</p>
            <p>Bank: Alinma Bank</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2a5e]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Freight Invoice
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}
