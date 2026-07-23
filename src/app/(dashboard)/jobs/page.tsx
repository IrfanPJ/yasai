import { Header } from "@/components/layout/header";
import { JobOrderTable } from "@/components/jobs/job-order-table";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { JobOrder, UserRole } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job Orders" };

export default async function JobsPage() {
  const serviceClient = createServiceClient();
  const supabase = await createClient();

  const [{ data }, { data: { user } }] = await Promise.all([
    serviceClient.from("job_orders").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.auth.getUser(),
  ]);

  let userRole: UserRole = "viewer";
  if (user) {
    const { data: profile } = await serviceClient.from("user_profiles").select("role").eq("id", user.id).single();
    if (profile) userRole = profile.role as UserRole;
  }

  return (
    <>
      <Header title="Job Orders" subtitle="Consolidate GCNs into truck shipments" />
      <div className="flex-1 p-4 lg:p-6">
        <div className="flex justify-end mb-4">
          <Button asChild size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2550]">
            <Link href="/jobs/new">
              <PlusCircle className="h-4 w-4" />
              New Job Order
            </Link>
          </Button>
        </div>
        <JobOrderTable jobs={(data || []) as JobOrder[]} userRole={userRole} />
      </div>
    </>
  );
}
