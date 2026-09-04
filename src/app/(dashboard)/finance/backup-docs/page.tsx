import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft } from "lucide-react";
import { BackupDocTable } from "@/components/finance/backup-doc-table";

export default async function BackupDocsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("backup_documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Finance
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">Backup Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">PI and PO documents for fund transfer compliance</p>
        </div>
        <Link href="/finance/backup-docs/new">
          <Button size="sm" className="gap-2 bg-[#071A3A] hover:bg-[#0d2a5e]">
            <Plus className="h-4 w-4" /> New Document
          </Button>
        </Link>
      </div>
      <BackupDocTable docs={data ?? []} />
    </div>
  );
}
