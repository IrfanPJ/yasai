import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { FreightInvoiceForm } from "@/components/invoices/freight-invoice-form";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import type { Invoice } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;
  const service = createServiceClient();

  const { data: invoice, error } = await service
    .from("invoices")
    .select("*, job_order:job_orders(job_number, destination)")
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();
  if (invoice.status !== "draft") redirect(`/invoices/${id}`);
  if (invoice.invoice_type === "uploaded") redirect(`/invoices/${id}`);

  return (
    <>
      <Header title={`Edit ${invoice.invoice_number}`} subtitle="Draft invoices can be edited until sent" />
      <div className="flex-1 p-4 lg:p-6">
        {invoice.invoice_type === "freight" ? (
          <FreightInvoiceForm invoice={invoice as Invoice} />
        ) : (
          <InvoiceForm invoice={invoice as Invoice} />
        )}
      </div>
    </>
  );
}
