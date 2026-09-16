"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BankProfile } from "@/types";

const NEW_BANK = "__new__";

interface Props {
  selectedId: string;
  currency?: string;
  onSelect: (bank: BankProfile | null) => void;
}

export function BankPicker({ selectedId, currency, onSelect }: Props) {
  const [banks, setBanks] = useState<BankProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bank-profiles")
      .then(r => r.json())
      .then((data: BankProfile[]) => { if (Array.isArray(data)) setBanks(data.filter(b => b.is_active)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Currency accounts first, then the rest — still pickable, just deprioritized.
  const sorted = currency
    ? [...banks].sort((a, b) => Number(b.currency === currency) - Number(a.currency === currency))
    : banks;

  return (
    <Select
      value={selectedId || NEW_BANK}
      onValueChange={v => onSelect(v === NEW_BANK ? null : banks.find(b => b.id === v) ?? null)}
    >
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading…" : "Select a saved bank, or enter a new one below"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NEW_BANK}>— Enter new bank below —</SelectItem>
        {sorted.map(b => (
          <SelectItem key={b.id} value={b.id}>
            {b.bank_name} {b.account_number ? `· ${b.account_number.slice(-4).padStart(b.account_number.length, "•")}` : ""} ({b.currency})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
