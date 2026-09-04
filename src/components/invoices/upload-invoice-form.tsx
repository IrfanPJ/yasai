"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { JobOrder } from "@/types";

export function UploadInvoiceForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    invoice_number: "",
    customer_name: "",
    currency: "SAR",
    job_order_id: "none",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/jobs?limit=200")
      .then(r => r.json())
      .then(d => setJobs(d.data || d || []))
      .catch(() => {});
  }, []);

  function setF(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.invoice_number.trim()) { toast.error("Invoice number is required"); return; }
    if (!form.customer_name.trim()) { toast.error("Customer name is required"); return; }
    setSaving(true);
    try {
      // Step 1: create the invoice record
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_type: "uploaded",
          invoice_number: form.invoice_number.trim(),
          customer_name: form.customer_name.trim(),
          currency: form.currency,
          job_order_id: form.job_order_id === "none" ? null : form.job_order_id,
          line_items: [],
          tax_rate: 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const inv = await res.json();

      // Step 2: upload the file if one was selected
      if (file) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        const upRes = await fetch(`/api/invoices/${inv.id}/upload`, { method: "POST", body: fd });
        setUploading(false);
        if (!upRes.ok) toast.warning("Invoice saved but file upload failed — you can upload from the detail page");
      }

      toast.success(`Invoice ${inv.invoice_number} saved`);
      router.push(`/invoices/${inv.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save invoice");
    } finally { setSaving(false); setUploading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Invoice Reference</CardTitle>
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

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Invoice File</CardTitle>
        </CardHeader>
        <CardContent>
          {file ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-sm text-blue-700 dark:text-blue-400 flex-1 truncate">{file.name}</span>
              <button type="button" className="text-xs text-muted-foreground hover:text-red-500" onClick={() => setFile(null)}>Remove</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-[#071A3A] dark:hover:border-white transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to select invoice file</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Excel, or image · optional — you can also upload later</p>
            </button>
          )}
          <input
            ref={fileRef} type="file"
            accept=".pdf,.xlsx,.xls,image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving || uploading} className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2a5e]">
          {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? "Uploading…" : "Save Invoice"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}
