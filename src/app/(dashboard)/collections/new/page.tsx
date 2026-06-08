import { Header } from "@/components/layout/header";
import { CollectionForm } from "@/components/collections/collection-form";

export const metadata = { title: "New Collection" };

export default function NewCollectionPage() {
  return (
    <>
      <Header
        title="New Goods Collection Note"
        subtitle="Fill in the details to create a new collection"
      />
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-5xl mx-auto">
          <CollectionForm />
        </div>
      </div>
    </>
  );
}
