import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import type { Invoice } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: invoice, error } = await service
    .from("invoices")
    .select("*, job_order:job_orders(job_number, destination)")
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await service.from("user_profiles").select("role").eq("id", user.id).single()
    : { data: null };

  return (
    <>
      <Header title={invoice.invoice_number} subtitle="Invoice Details" />
      <div className="flex-1 p-4 lg:p-6">
        <InvoiceDetail
          invoice={invoice as Invoice}
          userRole={profile?.role || "viewer"}
        />
      </div>
    </>
  );
}
