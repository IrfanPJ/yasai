"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Loader2, Landmark, Pencil, Check, X, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import type { Account } from "@/types";

type AccountWithBalance = Account & { balance: number };

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAccount, setNewAccount] = useState({ name: "", country: "", currency: "AED", opening_balance: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Manual display-only rates: "how many <reportCurrency> per 1 unit of this currency".
  const [reportCurrency, setReportCurrency] = useState("SAR");
  const [rates, setRates] = useState<Record<string, string>>({});

  function loadAccounts() {
    setLoading(true);
    fetch("/api/accounts")
      .then(r => r.json())
      .then((data: AccountWithBalance[]) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAccounts(); }, []);

  async function handleAdd() {
    if (!newAccount.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add account");
      toast.success("Account added");
      setNewAccount({ name: "", country: "", currency: "AED", opening_balance: "" });
      loadAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add account");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) throw new Error();
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_active: isActive } : a));
    } catch {
      toast.error("Failed to update account");
    }
  }

  async function handleRename(id: string) {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, name: updated.name } : a));
      setEditingId(null);
      toast.success("Account renamed");
    } catch {
      toast.error("Failed to rename account");
    }
  }

  const currenciesPresent = useMemo(
    () => Array.from(new Set(accounts.map(a => a.currency))),
    [accounts]
  );

  const consolidatedTotal = useMemo(() => {
    let total = 0;
    let allRated = true;
    for (const a of accounts) {
      if (a.currency === reportCurrency) {
        total += a.balance;
      } else {
        const rate = parseFloat(rates[a.currency] ?? "");
        if (!rate) { allRated = false; continue; }
        total += a.balance * rate;
      }
    }
    return { total, allRated };
  }, [accounts, rates, reportCurrency]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Accounts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your own bank accounts and their live balances — verified collections in, transfers/payments out.
        </p>
      </div>

      {/* Consolidated total */}
      {accounts.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#E67A32]" /> Consolidated Total
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide">Report In</Label>
                <Select value={reportCurrency} onValueChange={setReportCurrency}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {currenciesPresent.filter(c => c !== reportCurrency).map(c => (
                <div key={c} className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide">1 {c} = ? {reportCurrency}</Label>
                  <Input
                    type="number" step="0.0001"
                    className="w-32 font-mono"
                    value={rates[c] ?? ""}
                    onChange={e => setRates(p => ({ ...p, [c]: e.target.value }))}
                    placeholder="rate"
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-[#071A3A] dark:text-white">
                {reportCurrency} {fmt(consolidatedTotal.total)}
              </p>
              {!consolidatedTotal.allRated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a rate above for every currency to include it in this total.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add account */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#E67A32]" /> Add Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs uppercase tracking-wide">Name</Label>
              <Input
                value={newAccount.name}
                onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. UAE Operating Account"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Country</Label>
              <Input
                value={newAccount.country}
                onChange={e => setNewAccount(p => ({ ...p, country: e.target.value }))}
                placeholder="UAE"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Currency</Label>
              <Select value={newAccount.currency} onValueChange={v => setNewAccount(p => ({ ...p, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Opening Balance</Label>
              <Input
                type="number" step="0.01"
                value={newAccount.opening_balance}
                onChange={e => setNewAccount(p => ({ ...p, opening_balance: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <Button
            className="mt-3 gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]"
            disabled={saving || !newAccount.name.trim()}
            onClick={handleAdd}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Account
          </Button>
        </CardContent>
      </Card>

      {/* Account list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Landmark className="h-3.5 w-3.5" /> Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No accounts yet.</p>
          ) : accounts.map(a => (
            <div key={a.id} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${a.is_active ? "" : "opacity-50"}`}>
              <div className="min-w-0 flex-1">
                {editingId === a.id ? (
                  <div className="flex items-center gap-2">
                    <Input className="h-7 text-sm max-w-xs" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                    <button onClick={() => handleRename(a.id)} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#071A3A] dark:text-white truncate">{a.name}</p>
                    <button onClick={() => { setEditingId(a.id); setEditName(a.name); }} className="text-muted-foreground hover:text-[#071A3A] dark:hover:text-white shrink-0">
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{a.currency}{a.country ? ` · ${a.country}` : ""}</p>
              </div>
              <p className="font-mono font-bold tabular-nums text-[#071A3A] dark:text-white shrink-0">
                {a.currency} {fmt(a.balance)}
              </p>
              <Switch checked={a.is_active} onCheckedChange={v => handleToggle(a.id, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
