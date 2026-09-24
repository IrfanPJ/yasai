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
  const { data, error } = await serviceClient
    .from("invoices")
    .select("*, job_order:job_orders(job_number, destination, status)")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: existing } = await serviceClient
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["draft"].includes(existing.status)) {
    return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 400 });
  }

  const body = await request.json();
  const lineItems = Array.isArray(body.line_items) ? body.line_items : undefined;
  const subtotal = lineItems
    ? lineItems.reduce((s: number, item: { amount?: number }) => s + (item.amount || 0), 0)
    : undefined;
  const taxRate = body.tax_rate !== undefined ? Number(body.tax_rate) : undefined;
  const taxAmount = subtotal !== undefined && taxRate !== undefined ? subtotal * (taxRate / 100) : undefined;
  const totalAmount = subtotal !== undefined && taxAmount !== undefined ? subtotal + taxAmount : undefined;

  const updates: Record<string, unknown> = { updated_by: user.id };
  if (body.invoice_number) updates.invoice_number = String(body.invoice_number).trim();
  if ("reference_number" in body) updates.reference_number = body.reference_number || null;
  if (body.customer_name) updates.customer_name = body.customer_name;
  if ("customer_email" in body) updates.customer_email = body.customer_email || null;
  if ("customer_address" in body) updates.customer_address = body.customer_address || null;
  if ("customer_phone" in body) updates.customer_phone = body.customer_phone || null;
  if ("customer_contact_person" in body) updates.customer_contact_person = body.customer_contact_person || null;
  if ("shipper" in body) updates.shipper = body.shipper || null;
  if ("payment_terms" in body) updates.payment_terms = body.payment_terms || null;
  if ("manual_job_number" in body) updates.manual_job_number = body.manual_job_number || null;
  if ("port_of_loading" in body) updates.port_of_loading = body.port_of_loading || null;
  if ("packages_count" in body) updates.packages_count = body.packages_count || null;
  if ("final_destination" in body) updates.final_destination = body.final_destination || null;
  if (lineItems) updates.line_items = lineItems;
  if (subtotal !== undefined) updates.subtotal = subtotal;
  if (taxRate !== undefined) updates.tax_rate = taxRate;
  if (taxAmount !== undefined) updates.tax_amount = taxAmount;
  if (totalAmount !== undefined) updates.total_amount = totalAmount;
  if (body.currency) updates.currency = body.currency;
  if ("due_date" in body) updates.due_date = body.due_date || null;
  if ("payment_notes" in body) updates.payment_notes = body.payment_notes || null;
  if ("job_order_id" in body) updates.job_order_id = body.job_order_id || null;

  const { data, error } = await serviceClient
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
