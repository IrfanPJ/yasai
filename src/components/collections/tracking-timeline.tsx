"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, MapPin, ArrowRightLeft, CheckCircle2, XCircle, Clock, History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { TRACKING_EVENT_LABELS } from "@/types";
import type { GoodsCollectionNote, TrackingEvent, UserRole, Warehouse as WarehouseType } from "@/types";

interface TrackingTimelineProps {
  collection: GoodsCollectionNote;
  userRole: UserRole;
}

const TRANSFER_ROLES: UserRole[] = ["admin", "operations", "warehouse", "warehouse_supervisor"];
const APPROVER_ROLES: UserRole[] = ["admin", "operations", "warehouse_supervisor"];

export function TrackingTimeline({ collection, userRole }: TrackingTimelineProps) {
  const router = useRouter();
  const canTransfer = TRANSFER_ROLES.includes(userRole);
  const canApprove = APPROVER_ROLES.includes(userRole);

  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [requesting, setRequesting] = useState(false);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tracking-events?gcn_id=${collection.id}`);
      if (res.ok) setEvents(await res.json());
    } finally {
      setLoading(false);
    }
  }, [collection.id]);

  useEffect(() => {
    loadEvents();
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((data: WarehouseType[]) => setWarehouses(data.filter((w) => w.is_active)))
      .catch(() => {});
  }, [loadEvents]);

  const pendingTransfer = events.find(
    (e) => e.event_type === "warehouse_transfer" && e.approval_status === "pending"
  );

  async function handleRequestTransfer() {
    if (!toWarehouseId) {
      toast.error("Select a destination warehouse");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch(`/api/collections/${collection.id}/warehouse/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_warehouse_id: toWarehouseId, notes: transferNotes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to request transfer");
      }
      toast.success("Transfer requested — awaiting approval");
      setTransferOpen(false);
      setToWarehouseId("");
      setTransferNotes("");
      loadEvents();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request transfer");
    } finally {
      setRequesting(false);
    }
  }

  async function handleApprove(eventId: string) {
    setActioning(eventId);
    try {
      const res = await fetch(`/api/tracking-events/${eventId}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve");
      }
      toast.success("Transfer approved");
      loadEvents();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(eventId: string) {
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required");
      return;
    }
    setActioning(eventId);
    try {
      const res = await fetch(`/api/tracking-events/${eventId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to reject");
      }
      toast.success("Transfer rejected");
      setRejectingId(null);
      setRejectReason("");
      loadEvents();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActioning(null);
    }
  }

  return (
    <>
      <Card className="border-none shadow-sm mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Tracking
            </span>
            {collection.status === "in_warehouse" && canTransfer && !pendingTransfer && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transfer Warehouse
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {collection.warehouse && (
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Current warehouse:</span>
              <span className="font-medium">{collection.warehouse.code} — {collection.warehouse.name}</span>
            </div>
          )}

          {pendingTransfer && (
            <div className="rounded-md border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-3 text-sm space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-orange-700 dark:text-orange-300">
                <Clock className="h-3.5 w-3.5" />
                Transfer pending approval
                {pendingTransfer.to_warehouse && (
                  <span className="font-normal">
                    → {pendingTransfer.to_warehouse.code} — {pendingTransfer.to_warehouse.name}
                  </span>
                )}
              </div>
              {canApprove && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(pendingTransfer.id)}
                    disabled={actioning === pendingTransfer.id}
                  >
                    {actioning === pendingTransfer.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setRejectingId(pendingTransfer.id)}
                    disabled={actioning === pendingTransfer.id}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading timeline...
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracking events yet.</p>
          ) : (
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center pt-0.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        e.approval_status === "rejected"
                          ? "bg-red-500"
                          : e.approval_status === "pending"
                          ? "bg-orange-500"
                          : "bg-green-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{TRACKING_EVENT_LABELS[e.event_type]}</span>
                      {e.approval_status === "rejected" && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]">Rejected</Badge>
                      )}
                      {e.approval_status === "pending" && (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-[10px]">Pending</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.from_warehouse && <>{e.from_warehouse.code} → </>}
                      {e.to_warehouse ? `${e.to_warehouse.code} — ${e.to_warehouse.name}` : e.to_location}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(e.created_at)}
                      {e.requested_by_user && <> · by {e.requested_by_user.full_name}</>}
                    </div>
                    {e.approval_status === "rejected" && e.rejection_reason && (
                      <p className="text-xs text-red-600 dark:text-red-400">{e.rejection_reason}</p>
                    )}
                    {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* ── Request Transfer Dialog ── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Another Warehouse</DialogTitle>
            <DialogDescription>
              This will need supervisor approval before the GCN&apos;s warehouse actually changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Destination Warehouse</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.id !== collection.warehouse_id)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Notes</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Reason for transfer..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} disabled={requesting}>
              Cancel
            </Button>
            <Button onClick={handleRequestTransfer} disabled={requesting} className="gap-1.5">
              {requesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Request Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Transfer Dialog ── */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Warehouse Transfer</DialogTitle>
            <DialogDescription>Please provide a reason — this is shown on the timeline.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this transfer is being rejected..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)} disabled={!!actioning}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectingId && handleReject(rejectingId)}
              disabled={!!actioning}
              className="gap-1.5 bg-red-600 hover:bg-red-700"
            >
              {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
