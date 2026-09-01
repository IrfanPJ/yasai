import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `fund-collections/${id}/proof.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await serviceClient.storage
    .from("goods-collection-notes")
    .upload(storagePath, Buffer.from(arrayBuffer), { contentType: file.type || "application/octet-stream", upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = serviceClient.storage.from("goods-collection-notes").getPublicUrl(storagePath);

  const { data, error: dbError } = await serviceClient
    .from("fund_collections")
    .update({ proof_url: publicUrl, updated_by: user.id })
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

  const { data: current } = await serviceClient.from("fund_collections").select("proof_url").eq("id", id).single();
  if (current?.proof_url) {
    const marker = "/object/public/goods-collection-notes/";
    const idx = current.proof_url.indexOf(marker);
    if (idx !== -1) await serviceClient.storage.from("goods-collection-notes").remove([current.proof_url.slice(idx + marker.length)]);
  }

  const { data, error } = await serviceClient
    .from("fund_collections")
    .update({ proof_url: null, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}
