"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, Truck, Package, MapPin,
  Download, Clock, ChevronDown, ChevronUp,
  Send, ClipboardCheck, Navigation, Plus, User, Phone,
  FileText, History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateTime } from "@/lib/utils";
import type {
  JobOrder, GoodsCollectionNote, JobTransitUpdate,
  JobOrderTruck, JobStatusUpdate, UserRole, TruckStatus,
} from "@/types";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS,
  TRUCK_STATUS_LABELS, TRUCK_STATUS_COLORS,
  MANUAL_STATUS_OPTIONS,
} from "@/types";
import type { JobOrderStatus } from "@/types";

const JOB_STATUS_ORDER: JobOrderStatus[] = [
  "draft",
  "ready_for_collection",
  "goods_collected",
  "export_documentation_complete",
  "uae_customs_clearance",
  "border_exit",
  "saudi_customs_clearance",
  "in_transit_saudi",
  "delivered",
  "closed",
];

function JobStatusStepper({ status }: { status: JobOrderStatus }) {
  const currentIdx = JOB_STATUS_ORDER.indexOf(status);
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-4 pb-3">
        <div className="overflow-x-auto">
          <div className="flex items-center min-w-max gap-0">
            {JOB_STATUS_ORDER.map((s, i) => {
              const done = i < currentIdx;
              const current = i === currentIdx;
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                      current ? "bg-[#E67A32] text-white ring-4 ring-[#E67A32]/20" :
                      done    ? "bg-green-500 text-white" :
                               "bg-gray-200 dark:bg-gray-700 text-gray-400"
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                    </div>
                    <span className={`text-[10px] text-center w-16 leading-tight ${
                      current ? "text-[#E67A32] font-semibold" :
                      done    ? "text-green-600 dark:text-green-400" :
                               "text-muted-foreground"
                    }`}>
                      {JOB_STATUS_LABELS[s]}
                    </span>
                  </div>
                  {i < JOB_STATUS_ORDER.length - 1 && (
                    <div className={`h-0.5 w-6 mb-4 flex-shrink-0 ${done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface JobOrderDetailProps {
  job: JobOrder;
  gcns: GoodsCollectionNote[];
  transitUpdates: JobTransitUpdate[];
  trucks: JobOrderTruck[];
  statusUpdates: JobStatusUpdate[];
  userRole: UserRole;
}

async function postAction(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

/* ── Truck status flow: ordered list for the progress dots ── */
const TRUCK_STATUS_ORDER: TruckStatus[] = [
  "created", "goods_collected", "documents_uploaded", "uae_customs_submitted",
  "naql_foc_received", "bayan_received", "fazza_generated", "fazza_sent_to_driver",
  "reached_saudi_border", "inspection", "duty_payment", "entered_saudi_arabia",
  "delivered", "completed",
];

/* ── TruckCard ── */
function TruckCard({
  truck, jobId, isOps, isWarehouse, onUpdate,
}: {
  truck: JobOrderTruck;
  jobId: string;
  isOps: boolean;
  isWarehouse: boolean;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TruckStatus | "">("");
  const [fazzaToken, setFazzaToken] = useState(truck.fazza_token || "");
  const [dutyAmount, setDutyAmount] = useState(truck.customs_duty_amount?.toString() || "");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const currentIdx = TRUCK_STATUS_ORDER.indexOf(truck.status);
  const canUpdate = isOps || isWarehouse;

  async function handleStatusUpdate() {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      const body: Record<string, unknown> = { status: nextStatus, notes: statusNote || undefined };
      if (nextStatus === "fazza_generated" || nextStatus === "fazza_sent_to_driver") {
        body.fazza_token = fazzaToken || undefined;
      }
      if (nextStatus === "duty_payment") {
        body.customs_duty_amount = dutyAmount ? Number(dutyAmount) : undefined;
      }
      await postAction(`/api/jobs/${jobId}/trucks/${truck.id}/status`, body);
      toast.success("Truck status updated");
      setNextStatus("");
      setStatusNote("");
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  const availableStatuses = TRUCK_STATUS_ORDER.filter((s) => TRUCK_STATUS_ORDER.indexOf(s) > currentIdx);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Truck header row */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/30 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#071A3A] text-white text-xs font-bold flex-shrink-0">
            <Truck className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[#071A3A] dark:text-white">
                {truck.truck_number || "No truck #"}
              </span>
              {truck.trailer_number && (
                <span className="text-xs text-muted-foreground">/ {truck.trailer_number}</span>
              )}
              <Badge className={`${TRUCK_STATUS_COLORS[truck.status]} text-xs`}>
                {TRUCK_STATUS_LABELS[truck.status]}
              </Badge>
            </div>
            {truck.driver_name && (
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{truck.driver_name}</span>
                {truck.driver_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{truck.driver_phone}</span>}
              </div>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-4 py-4 space-y-4">
          {/* Status progress dots */}
          <div className="overflow-x-auto pb-1">
            <div className="flex items-center gap-1 min-w-max">
              {TRUCK_STATUS_ORDER.map((s, i) => {
                const done = i <= currentIdx;
                const current = i === currentIdx;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      current ? "bg-[#E67A32] ring-2 ring-[#E67A32]/30" :
                      done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                    }`} title={TRUCK_STATUS_LABELS[s]} />
                    {i < TRUCK_STATUS_ORDER.length - 1 && (
                      <div className={`w-4 h-px flex-shrink-0 ${done && i < currentIdx ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{TRUCK_STATUS_LABELS[truck.status]}</p>
          </div>

          {/* FAZZA token display */}
          {truck.fazza_token && (
            <div className="rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 p-3">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">FAZZA Token</p>
              <p className="text-sm font-mono">{truck.fazza_token}</p>
            </div>
          )}

          {/* Customs duty */}
          {truck.customs_duty_amount != null && (
            <div className="text-sm">
              <span className="text-muted-foreground text-xs">Customs Duty: </span>
              <span className="font-semibold">SAR {truck.customs_duty_amount.toLocaleString()}</span>
              {truck.customs_duty_paid_at && (
                <span className="text-xs text-green-600 ml-2">Paid {formatDateTime(truck.customs_duty_paid_at)}</span>
              )}
            </div>
          )}

          {/* Key timestamps */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {[
              ["NAQL FOC", truck.naql_foc_received_at],
              ["Bayan", truck.bayan_received_at],
              ["FAZZA Sent", truck.fazza_sent_at],
              ["Reached Border", truck.reached_border_at],
              ["Entered KSA", truck.entered_saudi_at],
              ["Delivered", truck.delivered_at],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={String(l)}>
                <span className="font-medium text-foreground">{l}: </span>
                {formatDateTime(String(v))}
              </div>
            ))}
          </div>

          {/* Status update form */}
          {canUpdate && truck.status !== "completed" && availableStatuses.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wide">Advance Status</Label>
                <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as TruckStatus)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select next status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{TRUCK_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(nextStatus === "fazza_generated" || nextStatus === "fazza_sent_to_driver") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">FAZZA Token</Label>
                    <Input value={fazzaToken} onChange={(e) => setFazzaToken(e.target.value)} placeholder="Enter FAZZA token" />
                  </div>
                )}

                {nextStatus === "duty_payment" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Customs Duty Amount (SAR)</Label>
                    <Input type="number" min={0} value={dutyAmount} onChange={(e) => setDutyAmount(e.target.value)} placeholder="0.00" />
                  </div>
                )}

                <Textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Notes (optional)..."
                  rows={2}
                />

                <Button
                  size="sm"
                  disabled={!nextStatus || updating}
                  onClick={handleStatusUpdate}
                  className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]"
                >
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Update Status
                </Button>
              </div>
            </>
          )}

          {truck.notes && (
            <p className="text-xs text-muted-foreground border-t pt-3">{truck.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── AddTruckForm ── */
function AddTruckForm({ jobId, onAdded }: { jobId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [truckNumber, setTruckNumber] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/trucks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truck_number: truckNumber || null, trailer_number: trailerNumber || null, driver_name: driverName || null, driver_phone: driverPhone || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Truck added");
      setOpen(false);
      setTruckNumber(""); setTrailerNumber(""); setDriverName(""); setDriverPhone("");
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add truck");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5 w-full mt-2" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add Truck
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Truck</DialogTitle>
            <DialogDescription>Add a new truck to this job order.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Truck Number</Label>
              <Input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} placeholder="ABC-1234" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Trailer Number</Label>
              <Input value={trailerNumber} onChange={(e) => setTrailerNumber(e.target.value)} placeholder="Trailer plate" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Driver Name</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide">Driver Phone</Label>
              <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+971..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving} className="gap-1.5 bg-[#071A3A] hover:bg-[#0d2550]">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add Truck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Main component ── */
export function JobOrderDetail({
  job, gcns, transitUpdates, trucks, statusUpdates, userRole,
}: JobOrderDetailProps) {
  const router = useRouter();
  const isAdmin = userRole === "admin";
  const isOps = ["admin", "operations"].includes(userRole);
  const isWarehouse = ["admin", "operations", "warehouse", "warehouse_supervisor"].includes(userRole);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [transitText, setTransitText] = useState("");
  const [deliveryScheduledAt, setDeliveryScheduledAt] = useState(job.delivery_scheduled_at?.slice(0, 16) || "");
  const [deliveryDriver, setDeliveryDriver] = useState(job.delivery_driver || "");
  const [driverSig, setDriverSig] = useState(false);
  const [gcnsOpen, setGcnsOpen] = useState(false);
  const [manualStatus, setManualStatus] = useState<string>("");
  const [manualNote, setManualNote] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const base = `/api/jobs/${job.id}`;
  const totalWeight = job.total_weight_kg ?? gcns.reduce((s, g) => s + (g.weight_kg ?? 0), 0);
  const totalCbm = job.total_cbm ?? gcns.reduce((s, g) => s + (g.volume_cbm ?? 0), 0);
  const weightPct = Math.min(100, Math.round((totalWeight / 24000) * 100));
  const cbmPct = Math.min(100, Math.round((totalCbm / 45) * 100));

  async function act(key: string, fn: () => Promise<unknown>) {
    setLoading(key);
    try {
      await fn();
      toast.success("Updated successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleManualStatusPost() {
    if (!manualStatus) return;
    setPostingUpdate(true);
    try {
      await postAction(`${base}/status-update`, { status: manualStatus, notes: manualNote || undefined });
      toast.success("Status update logged");
      setManualStatus("");
      setManualNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log update");
    } finally {
      setPostingUpdate(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071A3A] dark:text-white">{job.job_number}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <MapPin className="h-3.5 w-3.5" /> {job.destination}
            {job.departure_date && (
              <> · <Clock className="h-3.5 w-3.5" /> {new Date(job.departure_date).toLocaleDateString("en-GB")}</>
            )}
          </p>
          {(job.customer_name || job.consignee_name) && (
            <p className="text-sm text-muted-foreground mt-1">
              {job.customer_name && <span>Customer: <span className="font-medium text-foreground">{job.customer_name}</span></span>}
              {job.customer_name && job.consignee_name && <span className="mx-2">·</span>}
              {job.consignee_name && <span>Consignee: <span className="font-medium text-foreground">{job.consignee_name}</span></span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${JOB_STATUS_COLORS[job.status]} font-semibold`}>
            {JOB_STATUS_LABELS[job.status]}
          </Badge>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`${base}/packing-list/pdf`, "_blank")}>
            <Download className="h-3.5 w-3.5" /> Packing List PDF
          </Button>
        </div>
      </div>

      {/* Status stepper */}
      <JobStatusStepper status={job.status} />

      {/* Capacity */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Weight: {totalWeight.toFixed(1)} kg / 24,000 kg</span>
                <span className="font-semibold">{weightPct}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`h-2 rounded-full ${weightPct >= 90 ? "bg-orange-500" : weightPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${weightPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>CBM: {totalCbm.toFixed(3)} m³ / 45 m³</span>
                <span className="font-semibold">{cbmPct}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`h-2 rounded-full ${cbmPct >= 90 ? "bg-orange-500" : cbmPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${cbmPct}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trucks */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
            <Truck className="h-4 w-4" /> Trucks ({trucks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {trucks.length === 0 && (
            <p className="text-sm text-muted-foreground">No trucks added yet.</p>
          )}
          {trucks.map((truck) => (
            <TruckCard
              key={truck.id}
              truck={truck}
              jobId={job.id}
              isOps={isOps}
              isWarehouse={isWarehouse}
              onUpdate={() => router.refresh()}
            />
          ))}
          {isOps && <AddTruckForm jobId={job.id} onAdded={() => router.refresh()} />}
        </CardContent>
      </Card>

      {/* Linked GCNs */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setGcnsOpen((o) => !o)}>
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Linked GCNs ({gcns.length})</span>
            {gcnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {gcnsOpen && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {gcns.map((gcn) => (
                <Link key={gcn.id} href={`/collections/${gcn.id}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-semibold text-sm text-[#071A3A] dark:text-white">{gcn.collection_number}</span>
                    <span className="text-muted-foreground text-xs ml-2">{gcn.consignee_name}</span>
                    <div className="text-xs text-muted-foreground">{gcn.commodity}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {gcn.weight_kg ? `${gcn.weight_kg} kg` : ""}{gcn.volume_cbm ? ` · ${gcn.volume_cbm} m³` : ""}
                  </div>
                </Link>
              ))}
              {gcns.length === 0 && <p className="text-sm text-muted-foreground">No GCNs linked yet.</p>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── GM Approval ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> GM Approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.gm_approval_status === "approved" && (
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Approved by GM</Badge>
              {job.gm_approved_at && <span className="text-muted-foreground">{formatDateTime(job.gm_approved_at)}</span>}
            </div>
          )}
          {job.gm_approval_status === "rejected" && job.gm_rejection_reason && (
            <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
              <p className="font-medium text-red-700 dark:text-red-300 flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" />Rejected</p>
              <p className="text-red-600 dark:text-red-400 mt-1">{job.gm_rejection_reason}</p>
            </div>
          )}
          {job.gm_approval_status === "pending" && job.submitted_at && (
            <>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending GM Approval</Badge>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={loading === "approve"} onClick={() => act("approve", () => postAction(`${base}/approve`))}>
                    {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setRejectOpen(true)}>
                    <XCircle className="h-3.5 w-3.5" />Reject
                  </Button>
                </div>
              )}
            </>
          )}
          {(job.status === "draft" || job.gm_approval_status === "rejected") && isOps && (
            <Button size="sm" className="gap-1.5" disabled={loading === "submit"} onClick={() => act("submit", () => postAction(`${base}/submit-approval`))}>
              {loading === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {job.gm_approval_status === "rejected" ? "Resubmit for Approval" : "Submit for GM Approval"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Origin Dispatch ── */}
      {job.gm_approval_status === "approved" && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
              <Truck className="h-4 w-4" /> Origin Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.dispatched_at ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 gap-1"><CheckCircle2 className="h-3 w-3" />Dispatched</Badge>
                <span className="text-muted-foreground">{formatDateTime(job.dispatched_at)}</span>
              </div>
            ) : job.loaded_at ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Loading in Progress</Badge>
                  <span className="text-muted-foreground">{formatDateTime(job.loaded_at)}</span>
                  {job.driver_signature_received && <span className="text-xs text-green-600">Driver signed</span>}
                </div>
                {isWarehouse && (
                  <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" disabled={loading === "dispatch"} onClick={() => act("dispatch", () => postAction(`${base}/dispatch`))}>
                    {loading === "dispatch" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}Confirm Dispatch
                  </Button>
                )}
              </>
            ) : isWarehouse ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="driversig" checked={driverSig} onCheckedChange={(v) => setDriverSig(Boolean(v))} />
                  <Label htmlFor="driversig" className="text-sm font-normal cursor-pointer">Driver signed packing list</Label>
                </div>
                <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" disabled={loading === "load"} onClick={() => act("load", () => postAction(`${base}/load`, { driver_signature_received: driverSig }))}>
                  {loading === "load" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Confirm Loading
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting origin warehouse loading.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Transit Monitoring ── */}
      {job.dispatched_at && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
              <Navigation className="h-4 w-4" /> Transit Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transitUpdates.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transitUpdates.map((u) => (
                  <div key={u.id} className="text-sm bg-gray-50 dark:bg-gray-900/30 rounded-md px-3 py-2">
                    <p>{u.update_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(u.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
            {job.customs_cleared_at ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 gap-1"><CheckCircle2 className="h-3 w-3" />Customs Cleared</Badge>
                <span className="text-muted-foreground">{formatDateTime(job.customs_cleared_at)}</span>
              </div>
            ) : isOps ? (
              <div className="space-y-3">
                <Textarea value={transitText} onChange={(e) => setTransitText(e.target.value)} placeholder="Post a transit update..." rows={2} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!transitText.trim() || loading === "transit"} onClick={() => act("transit", async () => { await postAction(`${base}/transit-update`, { update_text: transitText }); setTransitText(""); })}>
                    {loading === "transit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Add Update
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700" disabled={loading === "customs"} onClick={() => act("customs", () => postAction(`${base}/customs-cleared`))}>
                    {loading === "customs" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Mark Customs Cleared
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting customs clearance update.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Destination Delivery ── */}
      {job.customs_cleared_at && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Destination Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.delivery_scheduled_at ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 gap-1"><Clock className="h-3 w-3" />Delivery Scheduled</Badge>
                <span className="text-muted-foreground">{formatDateTime(job.delivery_scheduled_at)}</span>
                {job.delivery_driver && <span>· Driver: {job.delivery_driver}</span>}
              </div>
            ) : isWarehouse ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Delivery Date &amp; Time</Label>
                    <Input type="datetime-local" value={deliveryScheduledAt} onChange={(e) => setDeliveryScheduledAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide">Local Driver</Label>
                    <Input value={deliveryDriver} onChange={(e) => setDeliveryDriver(e.target.value)} placeholder="Driver name" />
                  </div>
                </div>
                <Button size="sm" className="gap-1.5 bg-cyan-600 hover:bg-cyan-700" disabled={!deliveryScheduledAt || loading === "schedule"} onClick={() => act("schedule", () => postAction(`${base}/schedule-delivery`, { delivery_scheduled_at: deliveryScheduledAt || null, delivery_driver: deliveryDriver || null }))}>
                  {loading === "schedule" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}Schedule Delivery
                </Button>
              </div>
            ) : null}

            {job.delivery_scheduled_at && (
              <>
                <Separator />
                {job.destination_received_at ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />Goods Received at Destination</Badge>
                    <span className="text-muted-foreground">{formatDateTime(job.destination_received_at)}</span>
                  </div>
                ) : isWarehouse ? (
                  <Button size="sm" variant="outline" disabled={loading === "dest-received"} onClick={() => act("dest-received", () => postAction(`${base}/destination-received`))}>
                    {loading === "dest-received" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Confirm Goods Received at Destination
                  </Button>
                ) : null}

                {job.destination_received_at && (
                  job.pod_collected_at ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1"><CheckCircle2 className="h-3 w-3" />POD Collected</Badge>
                      <span className="text-muted-foreground">{formatDateTime(job.pod_collected_at)}</span>
                    </div>
                  ) : isWarehouse ? (
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={loading === "pod"} onClick={() => act("pod", () => postAction(`${base}/pod-collected`))}>
                      {loading === "pod" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}Collect Signed POD
                    </Button>
                  ) : null
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Operational Status Log ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#071A3A] dark:text-white flex items-center gap-2">
            <History className="h-4 w-4" /> Operational Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOps && (
            <div className="space-y-3 p-3 rounded-md border bg-gray-50 dark:bg-gray-900/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide">Status</Label>
                  <Select value={manualStatus} onValueChange={setManualStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUAL_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide">Remarks (optional)</Label>
                  <Input value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Any notes..." />
                </div>
              </div>
              <Button size="sm" disabled={!manualStatus || postingUpdate} onClick={handleManualStatusPost} className="gap-1.5">
                {postingUpdate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Log Update
              </Button>
            </div>
          )}

          {statusUpdates.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {statusUpdates.map((u) => (
                <div key={u.id} className="flex items-start gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-[#E67A32] flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{u.status}</span>
                    {u.notes && <p className="text-muted-foreground text-xs mt-0.5">{u.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(u.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No status updates yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {job.notes && (
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm">{job.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job Order</DialogTitle>
            <DialogDescription>This will send it back for revision. Please provide a reason.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain what needs to be corrected..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading === "reject"}>Cancel</Button>
            <Button
              className="gap-1.5 bg-red-600 hover:bg-red-700"
              disabled={loading === "reject" || !rejectReason.trim()}
              onClick={() => act("reject", async () => {
                await postAction(`${base}/reject`, { reason: rejectReason });
                setRejectOpen(false);
                setRejectReason("");
              })}
            >
              {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
