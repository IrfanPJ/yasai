import { Header } from "@/components/layout/header";
import { WaybillForm } from "@/components/waybills/waybill-form";

export const metadata = { title: "New Waybill" };

export default function NewWaybillPage() {
  return (
    <>
      <Header title="New Waybill" subtitle="Create a new shipment waybill" />
      <div className="flex-1 p-4 lg:p-6 max-w-5xl">
        <WaybillForm />
      </div>
    </>
  );
}
