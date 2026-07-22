import { Header } from "@/components/layout/header";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { createServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { Invoice } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, job_order:job_orders(job_number)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <Header title="Invoices" subtitle="Manage billing and track payments" />
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex justify-end mb-4">
          <Button asChild size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2550]">
            <Link href="/invoices/new">
              <PlusCircle className="h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
        <InvoiceTable invoices={(data || []) as Invoice[]} />
      </div>
    </>
  );
}
