import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "operations", "finance"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireRole([...MANAGE_ROLES, "viewer", "warehouse", "warehouse_supervisor"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("all") === "true";

  let query = auth.serviceClient.from("bank_profiles").select("*").order("bank_name");
  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Also used as an "upsert" from the transaction forms: submitting a bank
// name + account number that already exists just returns/refreshes that
// same saved profile instead of erroring, which is what makes the "once
// entered, it's remembered" behavior work without a separate save step.
export async function POST(request: NextRequest) {
  const auth = await requireRole([...MANAGE_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const bank_name = (body.bank_name || "").trim();
  if (!bank_name) return NextResponse.json({ error: "bank_name is required" }, { status: 400 });

  const { data, error } = await serviceClient
    .from("bank_profiles")
    .upsert(
      {
        bank_name,
        account_holder: body.account_holder?.trim() || null,
        account_number: body.account_number?.trim() || "",
        swift_code: body.swift_code?.trim() || null,
        currency: body.currency || "AED",
        country: body.country?.trim() || null,
        notes: body.notes?.trim() || null,
        created_by: user.id,
      },
      { onConflict: "bank_name,account_number" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
