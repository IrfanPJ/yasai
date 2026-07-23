import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { sendJobApprovalEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: job } = await serviceClient
    .from("job_orders")
    .select("gm_approval_status, job_number, destination, submitted_by")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.gm_approval_status !== "pending") {
    return NextResponse.json({ error: "Job is not pending approval" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("job_orders")
    .update({
      status: "ready_for_collection",
      gm_approval_status: "approved",
      gm_approved_by: user.id,
      gm_approved_at: new Date().toISOString(),
      gm_rejection_reason: null,
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_APPROVED",
    entity_type: "job_orders",
    entity_id: id,
  });

  try {
    if (job.submitted_by) {
      const { data: submitter } = await serviceClient
        .from("user_profiles")
        .select("email")
        .eq("id", job.submitted_by)
        .single();
      if (submitter?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
        await sendJobApprovalEmail({
          to: submitter.email,
          type: "approved",
          jobNumber: job.job_number,
          destination: job.destination,
          reviewUrl: `${appUrl}/jobs/${id}`,
        });
      }
    }
  } catch (emailErr) {
    console.error("Job approved email failed:", emailErr);
  }

  return NextResponse.json(data);
}
