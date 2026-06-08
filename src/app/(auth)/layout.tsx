export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071A3A] via-[#0d2a5c] to-[#071A3A] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
