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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { InvoiceLineItem, JobOrder } from "@/types";

interface InvoiceFormProps {
  preselectedJobId?: string;
}

const EMPTY_LINE: InvoiceLineItem = { description: "", qty: 1, unit_price: 0, amount: 0 };

export function InvoiceForm({ preselectedJobId }: InvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [taxRate, setTaxRate] = useState(15);
  const [dueDate, setDueDate] = useState("");
  const [jobOrderId, setJobOrderId] = useState(preselectedJobId || "none");
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ ...EMPTY_LINE }]);

  // Totals
  const subtotal = lineItems.reduce((s, l) => s + l.amount, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  useEffect(() => {
    fetch("/api/jobs?limit=200")
      .then((r) => r.json())
      .then((d) => setJobs(d.data || d || []))
      .catch(() => {});
  }, []);

  function updateLine(i: number, field: keyof InvoiceLineItem, value: string | number) {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[i], [field]: value };
      if (field === "qty" || field === "unit_price") {
        item.amount = Math.round(Number(item.qty) * Number(item.unit_price) * 100) / 100;
      }
      next[i] = item;
      return next;
    });
  }

  async function handleSubmit() {
    if (!customerName.trim()) { toast.error("Customer name is required"); return; }
    if (lineItems.some((l) => !l.description.trim())) { toast.error("All line items need a description"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail || null,
          customer_address: customerAddress || null,
          currency,
          tax_rate: taxRate,
          due_date: dueDate || null,
          job_order_id: jobOrderId === "none" ? null : jobOrderId,
          line_items: lineItems,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create invoice");
      }
      const inv = await res.json();
      toast.success(`Invoice ${inv.invoice_number} created`);
      router.push(`/invoices/${inv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Customer */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Customer Name <span className="text-red-500">*</span></Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer or company name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Customer Email</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="billing@customer.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Customer Address</Label>
            <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} placeholder="Billing address" />
          </div>
        </CardContent>
      </Card>

      {/* Invoice settings */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Invoice Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["SAR", "USD", "EUR", "AED", "GBP"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">VAT / Tax Rate (%)</Label>
            <Input type="number" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide">Linked Job Order</Label>
            <Select value={jobOrderId} onValueChange={setJobOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.destination}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1 border-b">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Amount</span>
            <span />
          </div>

          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center">
              <Input
                value={item.description}
                onChange={(e) => updateLine(i, "description", e.target.value)}
                placeholder="Service description"
                className="text-sm"
              />
              <Input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateLine(i, "qty", Number(e.target.value))}
                className="text-sm text-center"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.unit_price}
                onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))}
                className="text-sm text-right"
              />
              <div className="text-sm font-medium text-right pr-1">
                {currency} {item.amount.toFixed(2)}
              </div>
              <button
                onClick={() => setLineItems((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-500"
                disabled={lineItems.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLineItems((prev) => [...prev, { ...EMPTY_LINE }])}
          >
            <Plus className="h-3.5 w-3.5" />Add Line
          </Button>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{currency} {subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({taxRate}%)</span>
                <span>{currency} {taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1.5">
              <span>Total</span>
              <span>{currency} {total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={saving} className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Invoice
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
