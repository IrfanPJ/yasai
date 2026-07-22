import { Header } from "@/components/layout/header";
import { JobOrderForm } from "@/components/jobs/job-order-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Job Order" };

export default function NewJobPage() {
  return (
    <>
      <Header title="New Job Order" subtitle="Consolidate warehouse-approved GCNs into a truck shipment" />
      <div className="flex-1 p-4 lg:p-6">
        <JobOrderForm />
      </div>
    </>
  );
}
