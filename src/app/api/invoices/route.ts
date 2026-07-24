import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const INVOICE_ROLES = ["admin", "operations", "finance"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole([...INVOICE_ROLES]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const customer_name = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  if (!customer_name) return NextResponse.json({ error: "customer_name is required" }, { status: 400 });

  const { data: invoiceNumber, error: numError } = await serviceClient.rpc("generate_invoice_number");
  if (numError) return NextResponse.json({ error: "Failed to generate invoice number" }, { status: 500 });

  const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
  const subtotal = lineItems.reduce((s: number, item: { amount?: number }) => s + (item.amount || 0), 0);
  const taxRate = Number(body.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const { data, error } = await serviceClient
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber as string,
      job_order_id: body.job_order_id || null,
      customer_name,
      customer_email: body.customer_email || null,
      customer_address: body.customer_address || null,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: body.currency || "SAR",
      due_date: body.due_date || null,
      payment_notes: body.payment_notes || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "INVOICE_CREATED",
    entity_type: "invoices",
    entity_id: data.id,
    details: { invoice_number: invoiceNumber, customer_name },
  });

  return NextResponse.json(data, { status: 201 });
}
