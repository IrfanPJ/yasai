import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";
import { generateWaybillPDF } from "@/lib/pdf";
import { getLogoDataUrl } from "@/lib/logo";
import type { Waybill } from "@/types";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("waybills")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const body = await request.json();
  const { waybill_number, created_by, created_at, pdf_url: _pdf, ...rest } = body;
  void waybill_number; void created_by; void created_at;

  const { data, error } = await serviceClient
    .from("waybills")
    .update({ ...rest, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });

  // Regenerate PDF and overwrite in storage
  try {
    const logoDataUrl = getLogoDataUrl();
    const pdfBuffer = await generateWaybillPDF(data as Waybill, logoDataUrl);
    const storagePath = `waybills/${id}.pdf`;

    const { error: uploadError } = await serviceClient.storage
      .from("goods-collection-notes")
      .upload(storagePath, new Uint8Array(pdfBuffer), { contentType: "application/pdf", upsert: true });

    if (!uploadError) {
      const { data: urlData } = serviceClient.storage
        .from("goods-collection-notes")
        .getPublicUrl(storagePath);

      await serviceClient
        .from("waybills")
        .update({ pdf_url: urlData.publicUrl })
        .eq("id", id);

      data.pdf_url = urlData.publicUrl;
    }
  } catch (pdfErr) {
    console.error("[waybill] PDF regeneration failed:", pdfErr);
  }

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "UPDATE",
    entity_type: "waybills",
    entity_id: id,
  });

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(["admin", "operations"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { error } = await serviceClient
    .from("waybills")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
