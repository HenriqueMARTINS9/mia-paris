import { AppShell } from "@/components/crm/app-shell";
import { requireCurrentUserContext } from "@/features/auth/queries";
import { fallbackCrmSummary } from "@/lib/data/crm-summary";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireCurrentUserContext();

  return (
    <AppShell currentUser={currentUser} summary={fallbackCrmSummary}>
      {children}
    </AppShell>
  );
}
