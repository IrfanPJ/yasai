import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Upsert delivery note
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: collectionId } = await params;

  const check = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor", "viewer"]);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await req.json();
  const {
    doc_number, doc_date, job_number, shipper, ref_number, destination,
    customer_name, customer_address, customer_phone, customer_email,
    notes, items, receiver_name, received_date,
  } = body;

  const { error } = await check.serviceClient
    .from("delivery_notes")
    .upsert(
      {
        collection_id: collectionId,
        doc_number: doc_number || null,
        doc_date: doc_date || null,
        job_number: job_number || null,
        shipper: shipper || null,
        ref_number: ref_number || null,
        destination: destination || null,
        customer_name: customer_name || null,
        customer_address: customer_address || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        notes: notes || null,
        items: items || [],
        receiver_name: receiver_name || null,
        received_date: received_date || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "collection_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Delete delivery note
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id: collectionId } = await params;

  const check = await requireRole(["admin", "operations", "warehouse", "warehouse_supervisor", "viewer"]);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { error } = await check.serviceClient
    .from("delivery_notes")
    .delete()
    .eq("collection_id", collectionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
