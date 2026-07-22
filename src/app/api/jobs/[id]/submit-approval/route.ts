import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { sendJobApprovalEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: job } = await serviceClient
    .from("job_orders")
    .select("status, job_number, destination")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["draft", "pending_approval"].includes(job.status)) {
    return NextResponse.json({ error: "Job cannot be submitted in its current state" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("job_orders")
    .update({
      status: "pending_approval",
      gm_approval_status: "pending",
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "JOB_SUBMITTED_FOR_APPROVAL",
    entity_type: "job_orders",
    entity_id: id,
  });

  // Notify all admins
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
    const { data: admins } = await serviceClient
      .from("user_profiles")
      .select("email")
      .eq("role", "admin")
      .eq("is_active", true);

    for (const admin of admins || []) {
      if (!admin.email) continue;
      await sendJobApprovalEmail({
        to: admin.email,
        type: "submitted",
        jobNumber: job.job_number,
        destination: job.destination,
        reviewUrl: `${appUrl}/jobs/${id}`,
      });
    }
  } catch (emailErr) {
    console.error("Job approval email failed:", emailErr);
  }

  return NextResponse.json(data);
}
