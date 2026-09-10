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

  const invoiceType: string = body.invoice_type || "standard";

  // Freight and uploaded invoices use a caller-supplied number; standard uses auto-gen
  let invoiceNumber: string;
  if (invoiceType === "freight" || invoiceType === "uploaded") {
    invoiceNumber = typeof body.invoice_number === "string" ? body.invoice_number.trim() : "";
    if (!invoiceNumber) return NextResponse.json({ error: "invoice_number is required for freight/uploaded invoices" }, { status: 400 });
  } else {
    const { data: genNum, error: numError } = await serviceClient.rpc("generate_invoice_number");
    if (numError) return NextResponse.json({ error: "Failed to generate invoice number" }, { status: 500 });
    invoiceNumber = genNum as string;
  }

  const lineItems = Array.isArray(body.line_items) ? body.line_items : [];
  const subtotal = lineItems.reduce((s: number, item: { amount?: number }) => s + (item.amount || 0), 0);
  const taxRate = Number(body.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const { data, error } = await serviceClient
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      job_order_id: body.job_order_id || null,
      customer_name,
      customer_email: body.customer_email || null,
      customer_address: body.customer_address || null,
      customer_phone: body.customer_phone || null,
      customer_contact_person: body.customer_contact_person || null,
      shipper: body.shipper || null,
      payment_terms: body.payment_terms || null,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: body.currency || "SAR",
      due_date: body.due_date || null,
      payment_notes: body.payment_notes || null,
      port_of_loading: body.port_of_loading || null,
      packages_count: body.packages_count || null,
      final_destination: body.final_destination || null,
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
