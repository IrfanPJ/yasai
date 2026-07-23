"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import type { JobOrder, UserRole } from "@/types";
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from "@/types";
import { Truck, Trash2, Loader2 } from "lucide-react";

interface JobOrderTableProps {
  jobs: JobOrder[];
  userRole: UserRole;
}

export function JobOrderTable({ jobs, userRole }: JobOrderTableProps) {
  const router = useRouter();
  const canDelete = ["admin", "operations"].includes(userRole);

  const [pendingDelete, setPendingDelete] = useState<JobOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      toast.success(`${pendingDelete.job_number} deleted`);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No job orders yet. Create your first job order to consolidate GCNs into a shipment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50/50 dark:bg-gray-900/50">
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Job #</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Destination</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Truck</th>
              <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Capacity</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Departure</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Created</th>
              {canDelete && <th className="w-12" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map((job) => {
              const weightPct = job.total_weight_kg ? Math.min(100, Math.round((job.total_weight_kg / 24000) * 100)) : 0;
              const cbmPct = job.total_cbm ? Math.min(100, Math.round((job.total_cbm / 45) * 100)) : 0;
              const capPct = Math.max(weightPct, cbmPct);

              return (
                <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-bold text-[#071A3A] dark:text-white hover:text-[#E67A32] transition-colors">
                      {job.job_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{job.destination}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.truck_number ? (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {job.truck_number}
                      </span>
                    ) : <span className="text-xs italic">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${capPct >= 90 ? "bg-orange-500" : capPct >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${capPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {job.total_weight_kg ? `${job.total_weight_kg.toFixed(0)} kg` : "–"} · {job.total_cbm ? `${job.total_cbm.toFixed(1)} m³` : "–"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {job.departure_date ? new Date(job.departure_date).toLocaleDateString("en-GB") : <span className="text-xs italic">TBD</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${JOB_STATUS_COLORS[job.status]} text-xs font-semibold`}>
                      {JOB_STATUS_LABELS[job.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(job.created_at)}</td>
                  {canDelete && (
                    <td className="px-2 py-3">
                      {job.status === "draft" && (
                        <button
                          onClick={() => setPendingDelete(job)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                          title="Delete job order"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{pendingDelete?.job_number}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</Button>
            <Button className="gap-1.5 bg-red-600 hover:bg-red-700" disabled={deleting} onClick={handleDelete}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
