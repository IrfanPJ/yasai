import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { Invoice } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(_: unknown, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations", "finance"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { data: invoice } = await serviceClient
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!invoice.customer_email) {
    return NextResponse.json({ error: "Invoice has no customer email" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("invoices")
    .update({
      status: "sent",
      issued_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "INVOICE_SENT",
    entity_type: "invoices",
    entity_id: id,
    details: { to: invoice.customer_email },
  });

  try {
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateInvoicePDF(invoice as Invoice, logoDataUrl);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";

    await sendInvoiceEmail({
      to: invoice.customer_email,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      totalAmount: invoice.total_amount,
      currency: invoice.currency,
      dueDate: invoice.due_date,
      invoiceUrl: `${appUrl}/api/invoices/${id}/pdf`,
      pdfBuffer,
    });
  } catch (emailErr) {
    console.error("Invoice email failed:", emailErr);
  }

  return NextResponse.json(data);
}
