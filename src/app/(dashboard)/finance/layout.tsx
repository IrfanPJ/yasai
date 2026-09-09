import { Header } from "@/components/layout/header";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header title="Finance" subtitle="Fund collections, transfers & payments" />
      {children}
    </>
  );
}
