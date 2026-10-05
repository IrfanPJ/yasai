import { Sidebar } from "@/components/layout/sidebar";
import { NavAccessProvider } from "@/components/layout/nav-access-context";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("role, module_access")
    .eq("id", user.id)
    .single();

  return (
    <NavAccessProvider
      value={{
        role: (profile?.role as UserRole) ?? "viewer",
        moduleAccess: profile?.module_access ?? null,
      }}
    >
      <div className="flex min-h-screen bg-[#F8F6F3] dark:bg-[#071A3A]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </NavAccessProvider>
  );
}
