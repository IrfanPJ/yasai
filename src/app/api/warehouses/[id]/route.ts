import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

async function requireAdmin() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized", serviceClient };
  const { data: profile } = await serviceClient.from("user_profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, status: 403, error: "Forbidden", serviceClient };
  return { ok: true as const, serviceClient };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name)    updates.name    = body.name.trim();
  if (body.country) updates.country = body.country === "KSA" ? "KSA" : "UAE";
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

  const { data, error } = await auth.serviceClient.from("warehouses").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await auth.serviceClient.from("warehouses").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
