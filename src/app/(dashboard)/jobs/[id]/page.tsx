import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { JobOrderDetail } from "@/components/jobs/job-order-detail";
import type { JobOrder, GoodsCollectionNote, JobTransitUpdate } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: job, error } = await service
    .from("job_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: gcnLinks }, { data: updates }] = await Promise.all([
    user
      ? service.from("user_profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    service
      .from("job_order_gcns")
      .select("gcn_id, goods_collection_notes(*)")
      .eq("job_order_id", id),
    service
      .from("job_transit_updates")
      .select("*")
      .eq("job_order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const gcns = (gcnLinks || [])
    .map((r: { gcn_id: string; goods_collection_notes: unknown }) => r.goods_collection_notes)
    .filter(Boolean) as GoodsCollectionNote[];

  return (
    <>
      <Header title={job.job_number} subtitle="Job Order Details" />
      <div className="flex-1 p-4 lg:p-6">
        <JobOrderDetail
          job={job as JobOrder}
          gcns={gcns}
          transitUpdates={(updates || []) as JobTransitUpdate[]}
          userRole={profile?.role || "viewer"}
        />
      </div>
    </>
  );
}
