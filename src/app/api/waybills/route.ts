import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";
import { generateWaybillPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { Waybill } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = supabase
    .from("waybills")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) {
    query = query.or(
      `waybill_number.ilike.%${search}%,shipper_name.ilike.%${search}%,consignee_name.ilike.%${search}%,job_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();

  const { data: waybillNumber, error: numError } = await serviceClient.rpc("generate_waybill_number");
  if (numError) return NextResponse.json({ error: "Failed to generate waybill number" }, { status: 500 });

  const { data, error } = await serviceClient
    .from("waybills")
    .insert({ ...body, waybill_number: waybillNumber, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });

  // Generate PDF and store in Supabase Storage
  let pdfUrl: string | undefined;
  try {
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateWaybillPDF(data as Waybill, logoDataUrl);
    const storagePath = `waybills/${data.id}.pdf`;

    const { error: uploadError } = await serviceClient.storage
      .from("goods-collection-notes")
      .upload(storagePath, new Uint8Array(pdfBuffer), { contentType: "application/pdf", upsert: true });

    if (!uploadError) {
      const { data: urlData } = serviceClient.storage
        .from("goods-collection-notes")
        .getPublicUrl(storagePath);
      pdfUrl = urlData.publicUrl;
    }
  } catch (pdfErr) {
    console.error("[waybill] PDF generation failed:", pdfErr);
  }

  const { data: updated } = await serviceClient
    .from("waybills")
    .update({ pdf_url: pdfUrl })
    .eq("id", data.id)
    .select()
    .single();

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "CREATE",
    entity_type: "waybills",
    entity_id: data.id,
    details: { waybill_number: waybillNumber },
  });

  return NextResponse.json(updated || data, { status: 201 });
}
