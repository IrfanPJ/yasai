import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasModuleAccess, type ModuleKey } from "@/lib/modules";

type ModuleCheckResult =
  | { ok: true }
  | { ok: false; error: string; status: 401 | 403 };

async function checkModuleAccess(moduleKey: ModuleKey): Promise<ModuleCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized", status: 401 };

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("module_access")
    .eq("id", user.id)
    .single();

  if (!profile || !hasModuleAccess(profile.module_access, moduleKey)) {
    return { ok: false, error: "Forbidden: this module is restricted for your account", status: 403 };
  }
  return { ok: true };
}

// For API routes — caller turns a failure into a NextResponse.
export async function requireModuleApiAccess(moduleKey: ModuleKey): Promise<ModuleCheckResult> {
  return checkModuleAccess(moduleKey);
}

// For server-component pages/layouts — redirects home if restricted.
export async function requireModulePageAccess(moduleKey: ModuleKey): Promise<void> {
  const result = await checkModuleAccess(moduleKey);
  if (!result.ok) redirect("/");
}
