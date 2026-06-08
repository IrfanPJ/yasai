"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plane, Ship, Truck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignaturePad } from "./signature-pad";
import { cn } from "@/lib/utils";
import type { GoodsCollectionNote, CargoType, BillingType } from "@/types";

const schema = z.object({
  shipper_name: z.string().min(1, "Shipper name is required"),
  consignee_name: z.string().min(1, "Consignee name is required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  destination: z.string().min(1, "Destination is required"),
  commodity: z.string().min(1, "Commodity is required"),
  cargo_type: z.enum(["air", "sea", "land"]),
  shipping_mark: z.string().optional(),
  doc_ref_number: z.string().optional(),
  special_instructions: z.string().optional(),
  num_packages: z.string().optional(),
  package_type: z.string().optional(),
  volume_cbm: z.coerce.number().optional(),
  weight_kg: z.coerce.number().optional(),
  billing_type: z.enum(["customer", "supplier"]).optional(),
});

type FormData = z.infer<typeof schema>;

interface CollectionFormProps {
  defaultValues?: Partial<GoodsCollectionNote>;
  collectionId?: string;
  isEdit?: boolean;
}

const CARGO_OPTIONS: { value: CargoType; label: string; icon: React.ReactNode }[] = [
  { value: "air", label: "Air Freight", icon: <Plane className="h-4 w-4" /> },
  { value: "sea", label: "Sea Freight", icon: <Ship className="h-4 w-4" /> },
  { value: "land", label: "Land Freight", icon: <Truck className="h-4 w-4" /> },
];

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "supplier", label: "Supplier" },
];

export function CollectionForm({
  defaultValues,
  collectionId,
  isEdit = false,
}: CollectionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiverSig, setReceiverSig] = useState<string | undefined>(
    defaultValues?.receiver_signature
  );
  const [staffSig, setStaffSig] = useState<string | undefined>(
    defaultValues?.staff_signature
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shipper_name: defaultValues?.shipper_name || "",
      consignee_name: defaultValues?.consignee_name || "",
      contact_person: defaultValues?.contact_person || "",
      phone: defaultValues?.phone || "",
      email: defaultValues?.email || "",
      destination: defaultValues?.destination || "",
      commodity: defaultValues?.commodity || "",
      cargo_type: defaultValues?.cargo_type || "air",
      shipping_mark: defaultValues?.shipping_mark || "",
      doc_ref_number: defaultValues?.doc_ref_number || "",
      special_instructions: defaultValues?.special_instructions || "",
      num_packages: defaultValues?.num_packages || "",
      package_type: defaultValues?.package_type || "",
      volume_cbm: defaultValues?.volume_cbm,
      weight_kg: defaultValues?.weight_kg,
      billing_type: defaultValues?.billing_type,
    },
  });

  const cargoType = watch("cargo_type");
  const billingType = watch("billing_type");

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        receiver_signature: receiverSig,
        staff_signature: staffSig,
      };

      const url = isEdit
        ? `/api/collections/${collectionId}`
        : "/api/collections";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const result = await res.json();
      toast.success(
        isEdit
          ? "Collection updated successfully"
          : `Collection ${result.collection_number} created!`,
        { description: "PDF has been generated and stored." }
      );
      router.push(`/collections/${result.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ── Shipper & Consignee ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#071A3A] dark:text-white">
              Shipper Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shipper_name">
                Shipper Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="shipper_name"
                placeholder="Company / Individual name"
                {...register("shipper_name")}
                className={errors.shipper_name ? "border-red-500" : ""}
              />
              {errors.shipper_name && (
                <p className="text-xs text-red-500">{errors.shipper_name.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#071A3A] dark:text-white">
              Consignee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="consignee_name">
                Consignee Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="consignee_name"
                placeholder="Company / Individual name"
                {...register("consignee_name")}
                className={errors.consignee_name ? "border-red-500" : ""}
              />
              {errors.consignee_name && (
                <p className="text-xs text-red-500">{errors.consignee_name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  placeholder="Full name"
                  {...register("contact_person")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+971 XX XXX XXXX"
                  {...register("phone")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="consignee@email.com"
                {...register("email")}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Cargo Details ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">
            Cargo Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode of Transport */}
          <div className="space-y-2">
            <Label>
              Mode of Transport <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-3">
              {CARGO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("cargo_type", opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all",
                    cargoType === opt.value
                      ? "border-[#071A3A] bg-[#071A3A] text-white"
                      : "border-border hover:border-[#071A3A]/40 text-muted-foreground"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="destination">
                Destination <span className="text-red-500">*</span>
              </Label>
              <Input
                id="destination"
                placeholder="KSA, UAE, UK..."
                {...register("destination")}
                className={errors.destination ? "border-red-500" : ""}
              />
              {errors.destination && (
                <p className="text-xs text-red-500">{errors.destination.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="commodity">
                Commodity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="commodity"
                placeholder="Spare parts, Electronics..."
                {...register("commodity")}
                className={errors.commodity ? "border-red-500" : ""}
              />
              {errors.commodity && (
                <p className="text-xs text-red-500">{errors.commodity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shipping_mark">Shipping Mark</Label>
              <Input
                id="shipping_mark"
                placeholder="Marks & numbers"
                {...register("shipping_mark")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc_ref_number">Document Reference No.</Label>
              <Input
                id="doc_ref_number"
                placeholder="Invoice / BL / AWB"
                {...register("doc_ref_number")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="special_instructions">Special Instructions</Label>
            <Textarea
              id="special_instructions"
              placeholder="Handle with care, keep dry, temperature control..."
              rows={3}
              {...register("special_instructions")}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Package Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#071A3A] dark:text-white">
              Package Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="num_packages">No. of Packages</Label>
                <Input
                  id="num_packages"
                  placeholder="1 PLT, 5 CTN..."
                  {...register("num_packages")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="package_type">Package Type</Label>
                <Input
                  id="package_type"
                  placeholder="Pallet, Carton..."
                  {...register("package_type")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="volume_cbm">Volume (CBM)</Label>
                <Input
                  id="volume_cbm"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  {...register("volume_cbm")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg">Weight (KG)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("weight_kg")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#071A3A] dark:text-white">
              Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Billing of</Label>
              <div className="flex gap-3">
                {BILLING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue("billing_type", opt.value)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                      billingType === opt.value
                        ? "border-[#E67A32] bg-[#E67A32] text-white"
                        : "border-border hover:border-[#E67A32]/40 text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Signatures ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#071A3A] dark:text-white">
            Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SignaturePad
              label="Staff Signature"
              value={staffSig}
              onChange={setStaffSig}
            />
            <SignaturePad
              label="Receiver's Signature"
              value={receiverSig}
              onChange={setReceiverSig}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="gap-2 min-w-32">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEdit ? "Save Changes" : "Create Collection"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
