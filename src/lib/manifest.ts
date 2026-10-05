import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

function derivePalletCount(gcn: {
  pallet_dimensions?: unknown[] | null;
  num_packages?: string | null;
}): number {
  if (gcn.pallet_dimensions && gcn.pallet_dimensions.length > 0) {
    return gcn.pallet_dimensions.length;
  }
  const match = gcn.num_packages?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Attaches a newly-created GCN to its zone's open pending consolidation sheet,
 * creating that sheet if none is open yet. Conversion to a manifest is manual
 * only (via the "Convert to Manifest" button) — there is no pallet/CBM limit
 * that triggers it automatically.
 */
export async function attachGcnToConsolidationSheet(
  serviceClient: ServiceClient,
  gcn: {
    id: string;
    origin_zone?: string | null;
    pallet_dimensions?: unknown[] | null;
    num_packages?: string | null;
    volume_cbm?: number | null;
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
  const cbm = gcn.volume_cbm ?? 0;

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
    cbm,
    added_by: userId,
  });
  if (insertError) throw insertError;

  const newPalletTotal = sheet.pallet_count + palletCount;
  const newCbmTotal = sheet.cbm_total + cbm;
  const newItemTotal = sheet.item_count + 1;

  await serviceClient
    .from("consolidation_sheets")
    .update({ pallet_count: newPalletTotal, cbm_total: newCbmTotal, item_count: newItemTotal, updated_by: userId })
    .eq("id", sheet.id);

  await serviceClient.from("activity_logs").insert({
    user_id: userId,
    action: "MANIFEST_ITEM_ADDED",
    entity_type: "consolidation_sheet_items",
    entity_id: gcn.id,
    details: { sheet_id: sheet.id, pallet_count: palletCount, cbm },
  });
}

interface SheetRow {
  id: string;
  pallet_count: number;
  cbm_total: number;
  item_count: number;
}

async function findOpenSheet(serviceClient: ServiceClient, zone: string): Promise<SheetRow | null> {
  const { data } = await serviceClient
    .from("consolidation_sheets")
    .select("id, pallet_count, cbm_total, item_count")
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
    .select("id, pallet_count, cbm_total, item_count")
    .single();

  if (error) {
    // Unique-per-zone-pending race: another request created it first — use that one.
    if (error.code === "23505") {
      const existing = await findOpenSheet(serviceClient, zone);
      if (existing) return existing;
    }
    throw error;
  }

  // A brand-new pending sheet automatically inherits anything still waiting in
  // this zone's removal queue (removed from an earlier sheet, never made it
  // into a manifest) — so removed GCNs surface again instead of disappearing.
  return await requeuePendingRemovals(serviceClient, zone, data, userId);
}

async function requeuePendingRemovals(
  serviceClient: ServiceClient,
  zone: string,
  sheet: SheetRow,
  userId: string
): Promise<SheetRow> {
  const { data: queued } = await serviceClient
    .from("consolidation_sheet_removals")
    .select("id, gcn_id, pallet_count, cbm, remarks")
    .eq("zone", zone)
    .is("requeued_sheet_id", null)
    .is("restored_at", null)
    .order("removed_at");

  if (!queued || queued.length === 0) return sheet;

  let palletTotal = sheet.pallet_count;
  let cbmTotal = sheet.cbm_total;
  let itemTotal = sheet.item_count;

  for (const removal of queued) {
    itemTotal += 1;
    await serviceClient.from("consolidation_sheet_items").insert({
      sheet_id: sheet.id,
      gcn_id: removal.gcn_id,
      position: itemTotal,
      pallet_count: removal.pallet_count,
      cbm: removal.cbm,
      remarks: removal.remarks,
      added_by: userId,
    });
    await serviceClient
      .from("consolidation_sheet_removals")
      .update({ requeued_sheet_id: sheet.id, requeued_at: new Date().toISOString() })
      .eq("id", removal.id);
    palletTotal += removal.pallet_count;
    cbmTotal += removal.cbm;
  }

  await serviceClient
    .from("consolidation_sheets")
    .update({ pallet_count: palletTotal, cbm_total: cbmTotal, item_count: itemTotal, updated_by: userId })
    .eq("id", sheet.id);

  await serviceClient.from("activity_logs").insert({
    user_id: userId,
    action: "MANIFEST_ITEMS_REQUEUED",
    entity_type: "consolidation_sheets",
    entity_id: sheet.id,
    details: { zone, count: queued.length, gcn_ids: queued.map((r) => r.gcn_id) },
  });

  return { id: sheet.id, pallet_count: palletTotal, cbm_total: cbmTotal, item_count: itemTotal };
}

/**
 * Logs a sheet-item removal into the zone's removal queue before it's deleted,
 * so it can either be undone immediately or picked up automatically by the
 * next pending sheet created for that zone.
 */
export async function queueRemoval(
  serviceClient: ServiceClient,
  zone: string,
  item: { gcn_id: string; sheet_id: string; position: number; pallet_count: number; cbm: number; remarks?: string | null },
  userId: string
): Promise<string> {
  const { data, error } = await serviceClient
    .from("consolidation_sheet_removals")
    .insert({
      zone,
      gcn_id: item.gcn_id,
      original_sheet_id: item.sheet_id,
      original_position: item.position,
      pallet_count: item.pallet_count,
      cbm: item.cbm,
      remarks: item.remarks || null,
      removed_by: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Restores a queued removal back onto its original sheet, at its original
 * position — only possible while that sheet is still pending and nothing has
 * already picked the item up (a newer sheet's auto-requeue, or an earlier
 * restore).
 */
export async function restoreRemoval(
  serviceClient: ServiceClient,
  removalId: string,
  userId: string
): Promise<{ error?: string }> {
  const { data: removal } = await serviceClient
    .from("consolidation_sheet_removals")
    .select("*")
    .eq("id", removalId)
    .single();
  if (!removal) return { error: "Removal not found" };
  if (removal.restored_at) return { error: "Already restored" };
  if (removal.requeued_sheet_id) return { error: "Already picked up by a newer sheet — can no longer restore to the original" };

  const { data: originalSheet } = await serviceClient
    .from("consolidation_sheets")
    .select("status")
    .eq("id", removal.original_sheet_id)
    .single();
  if (!originalSheet || originalSheet.status !== "pending") {
    return { error: "Original sheet has since been converted to a manifest — cannot restore" };
  }

  const { data: maxPos } = await serviceClient
    .from("consolidation_sheet_items")
    .select("position")
    .eq("sheet_id", removal.original_sheet_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await serviceClient.from("consolidation_sheet_items").insert({
    sheet_id: removal.original_sheet_id,
    gcn_id: removal.gcn_id,
    position: (maxPos?.position ?? 0) + 1,
    pallet_count: removal.pallet_count,
    cbm: removal.cbm,
    remarks: removal.remarks,
    added_by: userId,
  });
  if (insertError) throw insertError;

  const { data: items } = await serviceClient
    .from("consolidation_sheet_items")
    .select("pallet_count, cbm")
    .eq("sheet_id", removal.original_sheet_id);
  const palletCount = (items || []).reduce((s: number, it: { pallet_count: number }) => s + (it.pallet_count || 0), 0);
  const cbmTotal = (items || []).reduce((s: number, it: { cbm: number }) => s + (it.cbm || 0), 0);
  await serviceClient
    .from("consolidation_sheets")
    .update({ pallet_count: palletCount, cbm_total: cbmTotal, item_count: (items || []).length, updated_by: userId })
    .eq("id", removal.original_sheet_id);

  await serviceClient
    .from("consolidation_sheet_removals")
    .update({ restored_at: new Date().toISOString(), restored_by: userId })
    .eq("id", removalId);

  await serviceClient.from("activity_logs").insert({
    user_id: userId,
    action: "MANIFEST_ITEM_RESTORED",
    entity_type: "consolidation_sheet_items",
    entity_id: removal.gcn_id,
    details: { sheet_id: removal.original_sheet_id, removal_id: removalId },
  });

  return {};
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

    // Fill in Job #/Job Date on each linked GCN's GR Report row — same as the
    // single-GCN "link to job" route does. Only where still unset, so an
    // existing link from elsewhere isn't clobbered.
    await serviceClient
      .from("gr_report_entries")
      .update({
        job_order_id: jobOrder.id,
        job_number: jobNumber as string,
        job_date: null,
        updated_by: userId,
      })
      .in("gcn_id", gcnIds)
      .is("job_order_id", null);
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
