import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

interface UpsertBankProfileInput {
  bank_name?: string | null;
  account_holder?: string | null;
  account_number?: string | null;
  swift_code?: string | null;
  currency?: string | null;
  createdBy: string;
}

/**
 * "Once the bank is entered, it's remembered": called whenever a fund
 * collection/transfer is saved with bank details typed fresh (no saved
 * bank_profile_id already chosen). Upserts on (bank_name, account_number)
 * so re-entering the same bank's details just reuses/refreshes that one
 * saved profile instead of creating duplicates. Returns null if there's
 * no bank name to save.
 */
export async function ensureBankProfile(serviceClient: ServiceClient, input: UpsertBankProfileInput): Promise<string | null> {
  const bank_name = input.bank_name?.trim();
  if (!bank_name) return null;

  const { data, error } = await serviceClient
    .from("bank_profiles")
    .upsert(
      {
        bank_name,
        account_holder: input.account_holder?.trim() || null,
        account_number: input.account_number?.trim() || "",
        swift_code: input.swift_code?.trim() || null,
        currency: input.currency || "AED",
        created_by: input.createdBy,
      },
      { onConflict: "bank_name,account_number" }
    )
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}
