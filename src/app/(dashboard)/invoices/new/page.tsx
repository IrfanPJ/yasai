"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { FreightInvoiceForm } from "@/components/invoices/freight-invoice-form";
import { UploadInvoiceForm } from "@/components/invoices/upload-invoice-form";
import { FileText, Truck, Upload } from "lucide-react";

type Mode = "standard" | "freight" | "upload";

const MODES: { key: Mode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: "freight",
    label: "Create Freight Invoice",
    icon: <Truck className="h-5 w-5" />,
    description: "Build a freight invoice using the YASAI template — with line items, country of origin, VAT, and shipping details.",
  },
  {
    key: "upload",
    label: "Upload Invoice",
    icon: <Upload className="h-5 w-5" />,
    description: "Record an existing invoice by number and attach the file (PDF, Excel, or image).",
  },
  {
    key: "standard",
    label: "Standard Invoice",
    icon: <FileText className="h-5 w-5" />,
    description: "General-purpose tax invoice with auto-generated INV-YYYY-NNNN number.",
  },
];

const SUBTITLES: Record<Mode, string> = {
  freight: "Freight invoice — YASAI template format",
  upload: "Upload an existing invoice file",
  standard: "Create a standard tax invoice",
};

export default function NewInvoicePage() {
  const [mode, setMode] = useState<Mode>("freight");

  return (
    <>
      <Header title="New Invoice" subtitle={SUBTITLES[mode]} />
      <div className="flex-1 p-4 lg:p-6 space-y-6">

        {/* Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
          {MODES.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={[
                "flex flex-col gap-2 p-4 rounded-xl border text-left transition-all",
                mode === m.key
                  ? "border-[#071A3A] bg-[#071A3A] text-white dark:border-white dark:bg-white dark:text-[#071A3A] shadow-md"
                  : "border-border bg-card hover:border-[#071A3A]/40 dark:hover:border-white/40",
              ].join(" ")}
            >
              <span className={mode === m.key ? "text-white dark:text-[#071A3A]" : "text-[#E67A32]"}>
                {m.icon}
              </span>
              <span className="text-sm font-semibold leading-tight">{m.label}</span>
              <span className={`text-xs leading-snug ${mode === m.key ? "text-white/70 dark:text-[#071A3A]/70" : "text-muted-foreground"}`}>
                {m.description}
              </span>
            </button>
          ))}
        </div>

        {/* Active form */}
        {mode === "freight" && <FreightInvoiceForm />}
        {mode === "upload" && <UploadInvoiceForm />}
        {mode === "standard" && <InvoiceForm />}

      </div>
    </>
  );
}
