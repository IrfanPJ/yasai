import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GoodsCollectionNote, CollectionStatus } from "@/types";
import { STATUS_LABELS, CARGO_TYPE_LABELS } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { YasaiLogo } from "@/components/layout/logo";
import { CheckCircle2, Circle, MapPin, Package, Weight, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ collectionNumber: string }>;
}

const STATUS_STEPS: CollectionStatus[] = [
  "collected",
  "in_warehouse",
  "in_transit",
  "customs_clearance",
  "out_for_delivery",
  "delivered",
];

const STATUS_DESCRIPTIONS: Record<CollectionStatus, string> = {
  collected: "Goods have been collected and logged",
  in_warehouse: "Goods are being processed at the warehouse",
  in_transit: "Shipment is on its way",
  customs_clearance: "Shipment is going through customs",
  out_for_delivery: "Shipment is out for final delivery",
  delivered: "Shipment has been delivered successfully",
};

export default async function TrackingPage({ params }: PageProps) {
  const { collectionNumber } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goods_collection_notes")
    .select(
      "collection_number, shipper_name, consignee_name, destination, weight_kg, cargo_type, status, status_history, created_at, updated_at"
    )
    .eq("collection_number", collectionNumber.toUpperCase())
    .is("deleted_at", null)
    .single();

  if (error || !data) notFound();

  const gcn = data as Pick<
    GoodsCollectionNote,
    | "collection_number"
    | "shipper_name"
    | "consignee_name"
    | "destination"
    | "weight_kg"
    | "cargo_type"
    | "status"
    | "status_history"
    | "created_at"
    | "updated_at"
  >;

  const currentStep = STATUS_STEPS.indexOf(gcn.status);

  // Build a map of status → timestamp from status_history
  const historyMap: Partial<Record<CollectionStatus, string>> = {};
  // First entry is always "collected" at created_at
  historyMap["collected"] = gcn.created_at;
  for (const entry of gcn.status_history ?? []) {
    historyMap[entry.status as CollectionStatus] = entry.changed_at;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <div className="bg-[#071A3A] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <YasaiLogo variant="light" />
          <div className="ml-auto text-right">
            <p className="text-xs text-white/60">Shipment Tracking</p>
            <p className="text-sm font-semibold">{gcn.collection_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Status Hero */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Current Status
              </p>
              <p className="text-2xl font-bold text-[#071A3A]">
                {STATUS_LABELS[gcn.status]}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {STATUS_DESCRIPTIONS[gcn.status]}
              </p>
              {gcn.updated_at && (
                <p className="text-xs text-[#E67A32] mt-1">
                  Updated {formatDateTime(gcn.updated_at)}
                </p>
              )}
            </div>
            {gcn.status === "delivered" ? (
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
            ) : (
              <div className="bg-[#071A3A]/10 p-3 rounded-xl">
                <Truck className="h-7 w-7 text-[#071A3A]" />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-6 space-y-0">
            {STATUS_STEPS.map((step, index) => {
              const isPast = index < currentStep;
              const isCurrent = index === currentStep;
              const isFuture = index > currentStep;
              const timestamp = historyMap[step];

              return (
                <div key={step} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPast
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-[#E67A32] text-white ring-4 ring-[#E67A32]/20"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 my-0.5 ${
                          isPast ? "bg-green-400" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-1 pb-6">
                    <p
                      className={`text-sm font-semibold ${
                        isFuture ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[#E67A32] mt-0.5">
                        {STATUS_DESCRIPTIONS[step]}
                      </p>
                    )}
                    {(isPast || isCurrent) && timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipment Details */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Shipment Details
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <DetailItem label="Collection No." value={gcn.collection_number} mono />
            <DetailItem label="Date" value={formatDate(gcn.created_at)} />
            <DetailItem label="Shipper" value={gcn.shipper_name} />
            <DetailItem label="Consignee" value={gcn.consignee_name} />
            <DetailItem
              label="Destination"
              value={gcn.destination}
              icon={<MapPin className="h-3.5 w-3.5" />}
            />
            <DetailItem
              label="Mode"
              value={CARGO_TYPE_LABELS[gcn.cargo_type]}
              icon={<Package className="h-3.5 w-3.5" />}
            />
            {gcn.weight_kg && (
              <DetailItem
                label="Weight"
                value={`${gcn.weight_kg.toFixed(2)} KG`}
                icon={<Weight className="h-3.5 w-3.5" />}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            YASAI Logistics Company · +966 55 932 6687 ·{" "}
            <a
              href="mailto:info@yasailogistics.com"
              className="hover:underline text-[#E67A32]"
            >
              info@yasailogistics.com
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            www.yasailogistics.com
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={`text-sm font-semibold text-[#071A3A] ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
