import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "finance", "viewer", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: account, error: accountError }, { data: balanceRow }] = await Promise.all([
    auth.serviceClient.from("accounts").select("*").eq("id", id).single(),
    auth.serviceClient.from("account_balances").select("balance").eq("account_id", id).single(),
  ]);

  if (accountError || !account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...account, balance: balanceRow?.balance ?? account.opening_balance });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.country === "string") updates.country = body.country.trim() || null;
  if (typeof body.currency === "string") updates.currency = body.currency;
  if (typeof body.bank_profile_id === "string") updates.bank_profile_id = body.bank_profile_id || null;
  if (body.opening_balance !== undefined) updates.opening_balance = parseFloat(body.opening_balance) || 0;
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

  const { data, error } = await auth.serviceClient
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
