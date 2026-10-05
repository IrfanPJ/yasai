"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Archive,
  Settings,
  LogOut,
  PlusCircle,
  Activity,
  Truck,
  Receipt,
  FileCheck2,
  Banknote,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { YasaiLogo } from "./logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useNavAccess } from "./nav-access-context";
import { hasModuleAccess, type ModuleKey } from "@/lib/modules";

const navItems: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
  moduleKey?: ModuleKey;
}[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "New Collection",
    href: "/collections/new",
    icon: PlusCircle,
    highlight: true,
    moduleKey: "collections",
  },
  {
    label: "Collections",
    href: "/collections",
    icon: FileText,
    moduleKey: "collections",
  },
  {
    label: "Job Orders",
    href: "/jobs",
    icon: Truck,
    moduleKey: "job_orders",
  },
  {
    label: "Manifest",
    href: "/manifest",
    icon: ClipboardList,
    moduleKey: "manifest",
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
    moduleKey: "invoices",
  },
  {
    label: "GR Report",
    href: "/gr-report",
    icon: FileSpreadsheet,
    moduleKey: "gr_report",
  },
  {
    label: "Records",
    href: "/records",
    icon: Archive,
    moduleKey: "records",
  },
  {
    label: "Waybills",
    href: "/waybills",
    icon: FileCheck2,
    moduleKey: "waybills",
  },
  ...(process.env.NEXT_PUBLIC_SHOW_FINANCE === "true"
    ? [{ label: "Finance", href: "/finance", icon: Banknote, moduleKey: "finance" as ModuleKey }]
    : []),
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: Activity,
    moduleKey: "audit_logs",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { moduleAccess } = useNavAccess();
  const visibleItems = navItems.filter(
    (item) => !item.moduleKey || hasModuleAccess(moduleAccess, item.moduleKey)
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-5 border-b border-gray-100">
        <YasaiLogo variant="dark" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                item.highlight && !isActive
                  ? "bg-[#E67A32] hover:bg-[#d46d28] text-white shadow-sm"
                  : isActive
                  ? "bg-[#071A3A] text-white shadow-sm"
                  : "text-[#4A5568] hover:bg-[#F7F0EA] hover:text-[#071A3A]"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Sign Out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-[#4A5568] hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// Mobile sidebar item list (same nav items, used in Sheet)
export function MobileNav({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { moduleAccess } = useNavAccess();
  const visibleItems = navItems.filter(
    (item) => !item.moduleKey || hasModuleAccess(moduleAccess, item.moduleKey)
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col h-full">
      <nav className="flex flex-col gap-1 py-4 flex-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                item.highlight && !isActive
                  ? "bg-[#E67A32] text-white"
                  : isActive
                  ? "bg-[#071A3A] text-white"
                  : "text-[#4A5568] hover:bg-[#F7F0EA]"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 py-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-[#4A5568] hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
