"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, CheckCircle, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FundCollectionForm } from "./fund-collection-form";
import type { FundCollection, FundCollectionStatus } from "@/types";

const STATUS_COLORS: Record<FundCollectionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  verified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

interface Props { collection: FundCollection }

export function FundCollectionDetail({ collection }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferRate, setTransferRate] = useState(collection.transfer_rate?.toString() ?? "");

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/fund-collections/${collection.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transfer_rate: transferRate ? parseFloat(transferRate) : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Collection approved");
      router.refresh();
    } catch { toast.error("Failed to approve"); }
    finally { setApproving(false); }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/fund-collections/${collection.id}/verify`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Collection verified");
      router.refresh();
    } catch { toast.error("Failed to verify"); }
    finally { setVerifying(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/fund-collections/${collection.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Deleted");
      router.push("/finance/collections");
      router.refresh();
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  }

  if (editing) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold">Edit Collection</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      <FundCollectionForm initial={collection} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {collection.status === "pending" && (
          <Button size="sm" onClick={handleApprove} disabled={approving} className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve
          </Button>
        )}
        {collection.status === "approved" && (
          <Button size="sm" onClick={handleVerify} disabled={verifying} className="gap-2 bg-green-600 hover:bg-green-700">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify (Accounts)
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)} className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Header card */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Collection Number</p>
              <p className="text-2xl font-bold font-mono text-[#E67A32]">{collection.collection_number}</p>
            </div>
            <Badge className={`text-sm px-3 py-1 capitalize ${STATUS_COLORS[collection.status]}`}>
              {collection.status}
            </Badge>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="text-sm font-semibold">{collection.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-semibold font-mono">{collection.currency} {Number(collection.amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Mode</p>
              <p className="text-sm font-semibold capitalize">{collection.payment_mode === "bank_transfer" ? "Bank Transfer" : "Cash"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collection Date</p>
              <p className="text-sm font-semibold">{fmtDate(collection.collection_date)}</p>
            </div>
          </div>
          {(collection.bank_reference || collection.destination_account || collection.transfer_rate) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {collection.transfer_rate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Transfer Rate</p>
                    <p className="text-sm font-semibold font-mono">{collection.transfer_rate}</p>
                  </div>
                )}
                {collection.bank_reference && (
                  <div>
                    <p className="text-xs text-muted-foreground">Bank Reference</p>
                    <p className="text-sm font-mono">{collection.bank_reference}</p>
                  </div>
                )}
                {collection.destination_account && (
                  <div>
                    <p className="text-xs text-muted-foreground">Destination Account</p>
                    <p className="text-sm font-mono">{collection.destination_account}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transfer rate input for approve */}
      {collection.status === "pending" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#071A3A] dark:text-white">Approval Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-w-xs">
              <Label>Transfer Rate (optional)</Label>
              <Input type="number" step="0.0001" value={transferRate} onChange={e => setTransferRate(e.target.value)} placeholder="e.g. 0.1020" />
            </div>
          </CardContent>
        </Card>
      )}

      {collection.notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{collection.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Approval timeline */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[#071A3A] dark:text-white">Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Sales Manager Approved</p>
            <p className="text-sm font-medium">{fmtDate(collection.sales_manager_approved_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accounts Verified</p>
            <p className="text-sm font-medium">{fmtDate(collection.accounts_verified_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>Delete <strong>{collection.collection_number}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
