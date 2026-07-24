import { Header } from "@/components/layout/header";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Invoice" };

export default function NewInvoicePage() {
  return (
    <>
      <Header title="New Invoice" subtitle="Create a tax invoice for a customer" />
      <div className="flex-1 p-4 lg:p-6">
        <InvoiceForm />
      </div>
    </>
  );
}
