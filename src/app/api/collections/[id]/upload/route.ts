import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

const ALLOWED_TYPES = ["commercial_invoice", "country_of_origin"] as const;
type DocType = typeof ALLOWED_TYPES[number];

const FIELD_MAP: Record<DocType, string> = {
  commercial_invoice: "commercial_invoice_url",
  country_of_origin: "country_of_origin_url",
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!docType || !ALLOWED_TYPES.includes(docType as DocType)) {
    return NextResponse.json({ error: "type must be commercial_invoice or country_of_origin" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "pdf";
  const path = `documents/${id}/${docType}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from("goods-collection-notes")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = serviceClient.storage
    .from("goods-collection-notes")
    .getPublicUrl(path);

  const { data, error } = await serviceClient
    .from("goods_collection_notes")
    .update({ [FIELD_MAP[docType as DocType]]: publicUrl, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await serviceClient.from("activity_logs").insert({
    user_id: user.id,
    action: "DOCUMENT_UPLOAD",
    entity_type: "goods_collection_notes",
    entity_id: id,
    details: { type: docType },
  });

  return NextResponse.json({ url: publicUrl, record: data });
}
