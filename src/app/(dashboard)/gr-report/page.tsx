import { Header } from "@/components/layout/header";
import { GrReportGrid } from "@/components/gr-report/gr-report-grid";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { GrReportEntry, UserRole } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "GR Report" };

export default async function GrReportPage() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: entries }, { data: profile }] = await Promise.all([
    serviceClient
      .from("gr_report_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    user
      ? serviceClient.from("user_profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const canEdit = ["admin", "operations", "finance"].includes(
    (profile?.role as UserRole) || "viewer"
  );

  return (
    <>
      <Header title="GR Report" subtitle="Master collection log — search, edit, and track document uploads" />
      <div className="flex-1 p-4 lg:p-6">
        <GrReportGrid data={(entries || []) as GrReportEntry[]} canEdit={canEdit} />
      </div>
    </>
  );
}
