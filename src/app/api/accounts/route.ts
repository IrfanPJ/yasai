import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "operations", "finance"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireRole([...MANAGE_ROLES, "viewer", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("all") === "true";

  const { data: accounts, error: accountsError } = await auth.serviceClient
    .from("accounts")
    .select("*")
    .order("country")
    .order("name");
  if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });

  const { data: balances, error: balancesError } = await auth.serviceClient
    .from("account_balances")
    .select("*");
  if (balancesError) return NextResponse.json({ error: balancesError.message }, { status: 500 });

  const balanceMap = new Map((balances ?? []).map((b) => [b.account_id, b.balance]));
  const merged = (accounts ?? [])
    .filter((a) => includeInactive || a.is_active)
    .map((a) => ({ ...a, balance: balanceMap.get(a.id) ?? a.opening_balance }));

  return NextResponse.json(merged);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole([...MANAGE_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await serviceClient
    .from("accounts")
    .insert({
      name,
      country: body.country?.trim() || null,
      currency: body.currency || "AED",
      bank_profile_id: body.bank_profile_id || null,
      opening_balance: body.opening_balance ? parseFloat(body.opening_balance) : 0,
      notes: body.notes?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
