import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const [{ data: job, error }, { data: gcnLinks }, { data: updates }] = await Promise.all([
    serviceClient.from("job_orders").select("*").eq("id", id).single(),
    serviceClient
      .from("job_order_gcns")
      .select("*, gcn:goods_collection_notes(*)")
      .eq("job_order_id", id),
    serviceClient
      .from("job_transit_updates")
      .select("*")
      .eq("job_order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (error || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...job,
    gcns: (gcnLinks || []).map((r: { gcn: unknown }) => r.gcn),
    transit_updates: updates || [],
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const allowed = ["destination","truck_number","driver_name","driver_phone","transporter_name","departure_date","notes","total_weight_kg","total_cbm"];
  const updates: Record<string, unknown> = { updated_by: user.id };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] ?? null;
  }

  const { data, error } = await serviceClient
    .from("job_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { serviceClient } = auth;

  const { data: job } = await serviceClient
    .from("job_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "draft") {
    return NextResponse.json({ error: "Only draft job orders can be deleted" }, { status: 400 });
  }

  const { error } = await serviceClient.from("job_orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
