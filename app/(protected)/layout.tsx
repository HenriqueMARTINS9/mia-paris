import { AppShell } from "@/components/crm/app-shell";
import { requireCurrentUserContext } from "@/features/auth/queries";
import { getCrmSummary } from "@/lib/data/crm";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireCurrentUserContext();
  const summary = await getCrmSummary();

  return (
    <AppShell currentUser={currentUser} summary={summary}>
      {children}
    </AppShell>
  );
}
