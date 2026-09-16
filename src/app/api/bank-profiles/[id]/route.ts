import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.bank_name === "string") updates.bank_name = body.bank_name.trim();
  if (typeof body.account_holder === "string") updates.account_holder = body.account_holder.trim() || null;
  if (typeof body.account_number === "string") updates.account_number = body.account_number.trim();
  if (typeof body.swift_code === "string") updates.swift_code = body.swift_code.trim() || null;
  if (typeof body.currency === "string") updates.currency = body.currency;
  if (typeof body.country === "string") updates.country = body.country.trim() || null;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

  const { data, error } = await auth.serviceClient
    .from("bank_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
