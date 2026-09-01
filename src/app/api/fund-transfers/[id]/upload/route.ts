import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

const ALLOWED_TYPES = ["receipt", "backup_document", "third_party_receipt"] as const;
type DocType = typeof ALLOWED_TYPES[number];

const FIELD_MAP: Record<DocType, string> = {
  receipt: "receipt_url",
  backup_document: "backup_document_url",
  third_party_receipt: "third_party_receipt_url",
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = (formData.get("type") as string | null) ?? "receipt";

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(docType as DocType)) {
    return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `fund-transfers/${id}/${docType}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from("goods-collection-notes")
    .upload(storagePath, Buffer.from(arrayBuffer), { contentType: file.type || "application/octet-stream", upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = serviceClient.storage.from("goods-collection-notes").getPublicUrl(storagePath);

  const { data, error: dbError } = await serviceClient
    .from("fund_transfers")
    .update({ [FIELD_MAP[docType as DocType]]: publicUrl, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl, record: data });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const docType = (searchParams.get("type") ?? "receipt") as DocType;
  if (!ALLOWED_TYPES.includes(docType)) return NextResponse.json({ error: "invalid type" }, { status: 400 });

  const { data: current } = await serviceClient.from("fund_transfers").select("receipt_url, backup_document_url, third_party_receipt_url").eq("id", id).single();
  const existingUrl = current?.[FIELD_MAP[docType] as keyof typeof current] as string | null;
  if (existingUrl) {
    const marker = "/object/public/goods-collection-notes/";
    const idx = existingUrl.indexOf(marker);
    if (idx !== -1) await serviceClient.storage.from("goods-collection-notes").remove([existingUrl.slice(idx + marker.length)]);
  }

  const { data, error } = await serviceClient
    .from("fund_transfers")
    .update({ [FIELD_MAP[docType]]: null, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}
