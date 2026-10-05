"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/types";

interface NavAccess {
  role: UserRole;
  moduleAccess: string[] | null;
}

const NavAccessContext = createContext<NavAccess | null>(null);

export function NavAccessProvider({
  value,
  children,
}: {
  value: NavAccess;
  children: React.ReactNode;
}) {
  return (
    <NavAccessContext.Provider value={value}>
      {children}
    </NavAccessContext.Provider>
  );
}

// Falls back to unrestricted if used outside the provider, so the sidebar
// never breaks — it just means module filtering is skipped.
export function useNavAccess(): NavAccess {
  const ctx = useContext(NavAccessContext);
  return ctx ?? { role: "viewer", moduleAccess: null };
}
