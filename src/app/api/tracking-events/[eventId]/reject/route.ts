import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

const APPROVER_ROLES = ["admin", "operations", "warehouse_supervisor"] as const;

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const auth = await requireRole([...APPROVER_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });

  const { data: event } = await serviceClient
    .from("gcn_tracking_events")
    .select("approval_status")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.approval_status !== "pending") {
    return NextResponse.json({ error: "This transfer has already been actioned" }, { status: 409 });
  }

  const { error } = await serviceClient
    .from("gcn_tracking_events")
    .update({
      approval_status: "rejected",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
