import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-role";
import { GR_REPORT_EDIT_ROLES, GR_REPORT_UPLOAD_ROLES } from "@/lib/gr-report";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

const ALLOWED_TYPES = ["freight_invoice", "delivery_note", "invoice"] as const;
type DocType = typeof ALLOWED_TYPES[number];

const FIELD_MAP: Record<DocType, string> = {
  freight_invoice: "freight_invoice_url",
  delivery_note: "delivery_note_url",
  invoice: "invoice_url",
};

const BUCKET = "goods-collection-notes";
const PUBLIC_URL_MARKER = `/object/public/${BUCKET}/`;

async function removeIfExists(serviceClient: SupabaseClient, url: string | null | undefined) {
  if (!url) return;
  const idx = url.indexOf(PUBLIC_URL_MARKER);
  if (idx === -1) return;
  await serviceClient.storage.from(BUCKET).remove([url.slice(idx + PUBLIC_URL_MARKER.length)]);
}

// Uploading a document is lower-stakes than editing the row's financial
// fields (PATCH stays finance-restricted) — anyone who can manage a
// consolidation sheet should be able to attach these from there too.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(GR_REPORT_UPLOAD_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!docType || !ALLOWED_TYPES.includes(docType as DocType)) {
    return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }

  // A replacement upload with a different extension would otherwise leave
  // the previous file orphaned in storage (upsert only dedupes same-path).
  const { data: current } = await serviceClient
    .from("gr_report_entries")
    .select("freight_invoice_url, delivery_note_url, invoice_url")
    .eq("id", id)
    .single();
  await removeIfExists(serviceClient, current?.[FIELD_MAP[docType as DocType] as keyof typeof current] as string | null | undefined);

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `gr-report/${id}/${docType}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(arrayBuffer), { contentType: file.type || "application/octet-stream", upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = serviceClient.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: dbError } = await serviceClient
    .from("gr_report_entries")
    .update({ [FIELD_MAP[docType as DocType]]: publicUrl, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl, record: data });
}

// Deleting a document is more consequential than adding one, so this stays
// on the tighter, finance-restricted role set rather than the upload roles.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireRole(GR_REPORT_EDIT_ROLES);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, serviceClient } = auth;

  const { searchParams } = new URL(request.url);
  const docType = searchParams.get("type") as DocType | null;
  if (!docType || !ALLOWED_TYPES.includes(docType)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const { data: current } = await serviceClient
    .from("gr_report_entries")
    .select("freight_invoice_url, delivery_note_url, invoice_url")
    .eq("id", id)
    .single();

  await removeIfExists(serviceClient, current?.[FIELD_MAP[docType] as keyof typeof current] as string | null | undefined);

  const { data, error } = await serviceClient
    .from("gr_report_entries")
    .update({ [FIELD_MAP[docType]]: null, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}
