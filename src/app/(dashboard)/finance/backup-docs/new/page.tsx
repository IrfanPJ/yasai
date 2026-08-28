import { BackupDocForm } from "@/components/finance/backup-doc-form";

export default function NewBackupDocPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#071A3A] dark:text-white">New Backup Document</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create a PI or PO to justify a fund transfer</p>
      </div>
      <BackupDocForm />
    </div>
  );
}
