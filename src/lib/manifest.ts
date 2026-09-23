import type { createServiceClient } from "@/lib/supabase/server";
import { CONSOLIDATION_PALLET_LIMIT } from "@/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

function derivePalletCount(gcn: {
  pallet_dimensions?: unknown[] | null;
  num_packages?: string | null;
}): number {
  if (gcn.pallet_dimensions && gcn.pallet_dimensions.length > 0) {
    return gcn.pallet_dimensions.length;
  }
  const match = gcn.num_packages?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Attaches a newly-created GCN to its zone's open pending consolidation sheet,
 * creating that sheet if none is open yet. Auto-converts the sheet to a
 * manifest (and spins off a pre-filled Job Order) once its running pallet
 * total reaches CONSOLIDATION_PALLET_LIMIT.
 */
export async function attachGcnToConsolidationSheet(
  serviceClient: ServiceClient,
  gcn: {
    id: string;
    origin_zone?: string | null;
    pallet_dimensions?: unknown[] | null;
    num_packages?: string | null;
  },
  userId: string
): Promise<void> {
  const zone = gcn.origin_zone;
  if (zone !== "mainland" && zone !== "jafza") return;

  let sheet = await findOpenSheet(serviceClient, zone);
  if (!sheet) {
    sheet = await createOpenSheet(serviceClient, zone, userId);
  }

  const palletCount = derivePalletCount(gcn);

  const { data: maxPos } = await serviceClient
    .from("consolidation_sheet_items")
    .select("position")
    .eq("sheet_id", sheet.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await serviceClient.from("consolidation_sheet_items").insert({
    sheet_id: sheet.id,
    gcn_id: gcn.id,
    position: (maxPos?.position ?? 0) + 1,
    pallet_count: palletCount,
    added_by: userId,
  });
  if (insertError) throw insertError;

  const newPalletTotal = sheet.pallet_count + palletCount;
  const newItemTotal = sheet.item_count + 1;

  await serviceClient
    .from("consolidation_sheets")
    .update({ pallet_count: newPalletTotal, item_count: newItemTotal, updated_by: userId })
    .eq("id", sheet.id);

  if (newPalletTotal >= CONSOLIDATION_PALLET_LIMIT) {
    await convertSheetToManifest(serviceClient, sheet.id, userId, "auto");
  }
}

interface SheetRow {
  id: string;
  pallet_count: number;
  item_count: number;
}

async function findOpenSheet(serviceClient: ServiceClient, zone: string): Promise<SheetRow | null> {
  const { data } = await serviceClient
    .from("consolidation_sheets")
    .select("id, pallet_count, item_count")
    .eq("zone", zone)
    .eq("status", "pending")
    .maybeSingle();
  return data ?? null;
}

async function createOpenSheet(serviceClient: ServiceClient, zone: string, userId: string): Promise<SheetRow> {
  const { data: sheetNumber, error: numError } = await serviceClient.rpc("generate_sheet_number", { p_zone: zone });
  if (numError) throw numError;

  const { data, error } = await serviceClient
    .from("consolidation_sheets")
    .insert({ sheet_number: sheetNumber as string, zone, created_by: userId, updated_by: userId })
    .select("id, pallet_count, item_count")
    .single();

  if (error) {
    // Unique-per-zone-pending race: another request created it first — use that one.
    if (error.code === "23505") {
      const existing = await findOpenSheet(serviceClient, zone);
      if (existing) return existing;
    }
    throw error;
  }
  return data;
}

/**
 * Converts a pending sheet into a manifest: flips its status (same row, same
 * sheet_number — only the label changes) and creates a Job Order pre-filled
 * with the sheet's GCNs. Returns the new Job Order id, or null if the sheet
 * wasn't eligible (already converted).
 */
export async function convertSheetToManifest(
  serviceClient: ServiceClient,
  sheetId: string,
  userId: string,
  conversionType: "auto" | "manual"
): Promise<string | null> {
  const { data: sheet } = await serviceClient
    .from("consolidation_sheets")
    .select("*")
    .eq("id", sheetId)
    .single();
  if (!sheet || sheet.status !== "pending") return null;

  const { data: items } = await serviceClient
    .from("consolidation_sheet_items")
    .select("gcn_id")
    .eq("sheet_id", sheetId)
    .order("position");

  const { data: jobNumber, error: jobNumError } = await serviceClient.rpc("generate_job_number");
  if (jobNumError) throw jobNumError;

  const zoneLabel = sheet.zone === "jafza" ? "JAFZA" : "Mainland";
  const { data: jobOrder, error: jobErr } = await serviceClient
    .from("job_orders")
    .insert({
      job_number: jobNumber as string,
      destination: `${zoneLabel} Consolidation — ${sheet.sheet_number}`,
      notes: `Auto-created from consolidation sheet ${sheet.sheet_number}`,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (jobErr) throw jobErr;

  const gcnIds = (items || []).map((it: { gcn_id: string }) => it.gcn_id);

  if (gcnIds.length > 0) {
    await serviceClient
      .from("job_order_gcns")
      .insert(gcnIds.map((gcnId) => ({ job_order_id: jobOrder.id, gcn_id: gcnId, added_by: userId })));

    const { data: links } = await serviceClient
      .from("job_order_gcns")
      .select("gcn:goods_collection_notes(weight_kg, volume_cbm)")
      .eq("job_order_id", jobOrder.id);

    let totalWeight = 0;
    let totalCbm = 0;
    for (const link of links || []) {
      const g = (link as { gcn: { weight_kg?: number; volume_cbm?: number } }).gcn;
      totalWeight += g?.weight_kg ?? 0;
      totalCbm += g?.volume_cbm ?? 0;
    }
    await serviceClient
      .from("job_orders")
      .update({ total_weight_kg: totalWeight, total_cbm: totalCbm })
      .eq("id", jobOrder.id);
  }

  await serviceClient
    .from("consolidation_sheets")
    .update({
      status: "manifest",
      converted_at: new Date().toISOString(),
      converted_by: userId,
      conversion_type: conversionType,
      job_order_id: jobOrder.id,
      updated_by: userId,
    })
    .eq("id", sheetId);

  await serviceClient.from("activity_logs").insert({
    user_id: userId,
    action: "MANIFEST_CONVERTED",
    entity_type: "consolidation_sheets",
    entity_id: sheetId,
    details: { sheet_number: sheet.sheet_number, conversion_type: conversionType, job_order_id: jobOrder.id },
  });

  return jobOrder.id as string;
}
