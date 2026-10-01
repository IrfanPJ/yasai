import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import type { Invoice, UserProfile } from "@/types";

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
    .select("*, job_order:job_orders(job_number, destination), creator:user_profiles!invoices_created_by_fkey(id, full_name, email)")
    .eq("id", id)
    .single();

  if (error || !invoice) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await service.from("user_profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const userRole = profile?.role || "viewer";

  // Only needed for the admin-only "reassign creator" control
  const { data: allUsers } = userRole === "admin"
    ? await service.from("user_profiles").select("id, full_name, email").eq("is_active", true).order("full_name")
    : { data: null };

  return (
    <>
      <Header title={invoice.invoice_number} subtitle="Invoice Details" />
      <div className="flex-1 p-4 lg:p-6">
        <InvoiceDetail
          invoice={invoice as Invoice}
          userRole={userRole}
          allUsers={(allUsers as Pick<UserProfile, "id" | "full_name" | "email">[] | null) ?? []}
        />
      </div>
    </>
  );
}
