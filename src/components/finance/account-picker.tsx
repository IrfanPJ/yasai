"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@/types";

interface Props {
  value: string;
  onChange: (accountId: string) => void;
  currency?: string;
  placeholder?: string;
}

export function AccountPicker({ value, onChange, currency, placeholder = "None selected" }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then(r => r.json())
      .then((data: Account[]) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  const sorted = currency
    ? [...accounts].sort((a, b) => Number(b.currency === currency) - Number(a.currency === currency))
    : accounts;

  return (
    <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— None —</SelectItem>
        {sorted.map(a => (
          <SelectItem key={a.id} value={a.id}>
            {a.name} ({a.currency}{a.country ? ` · ${a.country}` : ""})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
