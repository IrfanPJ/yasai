"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface PickerOption {
  value: string;       // UUID
  label: string;       // e.g. "FC-2026-0001"
  sublabel?: string;   // e.g. "ABC Trading · AED 50,000"
  badge?: string;      // e.g. "pending"
}

interface Props {
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export function RecordPicker({ options, value, onChange, placeholder = "None (unlinked)", loading = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = search
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.sublabel ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setSearch("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent transition-colors min-h-9"
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link2 className="h-3.5 w-3.5 text-[#E67A32] shrink-0" />
            <div className="min-w-0 text-left">
              <span className="font-mono font-semibold text-[#E67A32]">{selected.label}</span>
              {selected.sublabel && (
                <span className="text-muted-foreground ml-2 text-xs truncate">{selected.sublabel}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground flex-1 text-left">{loading ? "Loading…" : placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              onClick={clear}
              className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Type to search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* None option */}
            <button
              type="button"
              onClick={() => select("")}
              className={`w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors ${!value ? "bg-accent/50" : ""}`}
            >
              None (unlinked)
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No records found</p>
            ) : filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => select(o.value)}
                className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-t border-border/50 ${value === o.value ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-[#E67A32] truncate">{o.label}</p>
                    {o.sublabel && <p className="text-xs text-muted-foreground truncate mt-0.5">{o.sublabel}</p>}
                  </div>
                  {o.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-muted-foreground shrink-0 capitalize">
                      {o.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
