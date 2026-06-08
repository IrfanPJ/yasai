"use client";

import { useState } from "react";
import { Menu, Moon, Sun, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./sidebar";
import { YasaiLogo } from "./logo";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6 gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {title && (
            <div>
              <h1 className="text-base font-semibold text-[#071A3A] dark:text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-6 py-5 border-b border-gray-100 bg-white">
            <SheetTitle asChild>
              <YasaiLogo variant="dark" />
            </SheetTitle>
          </SheetHeader>
          <div className="px-3">
            <MobileNav onClose={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
