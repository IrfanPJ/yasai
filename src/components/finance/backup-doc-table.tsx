"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BackupDocument } from "@/types";

function fmtDate(d: string) {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { docs: BackupDocument[] }

export function BackupDocTable({ docs }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = docs.filter(d =>
    !search ||
    d.doc_number.toLowerCase().includes(search.toLowerCase()) ||
    d.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/backup-docs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      router.refresh();
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by number or supplier…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 dark:bg-gray-900/50">
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No backup documents</TableCell></TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                <TableCell className="font-mono font-semibold text-[#E67A32]">{d.doc_number}</TableCell>
                <TableCell>
                  <Badge className={`text-xs uppercase ${d.doc_type === "pi" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                    {d.doc_type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{d.supplier_name}</TableCell>
                <TableCell className="font-mono tabular-nums">{d.currency} {Number(d.amount).toLocaleString()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(d.created_at)}</TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={deletingId === d.id}
                    onClick={() => handleDelete(d.id)}
                    className="h-8 w-8 text-red-400 hover:text-red-600"
                  >
                    {deletingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
