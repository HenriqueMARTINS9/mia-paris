import { AppSidebar } from "@/components/crm/app-sidebar";
import { AppTopbar } from "@/components/crm/app-topbar";
import { CrmSummaryProvider } from "@/components/crm/crm-summary-provider";
import { AuthRoleProvider } from "@/features/auth/components/auth-role-provider";
import type { CurrentUserContext } from "@/features/auth/types";
import type { CrmSummary } from "@/types/crm";

interface AppShellProps {
  children: React.ReactNode;
  currentUser: CurrentUserContext;
  summary: CrmSummary;
}

export function AppShell({
  children,
  currentUser,
  summary: initialSummary,
}: Readonly<AppShellProps>) {
  return (
    <AuthRoleProvider role={currentUser.appUser?.role}>
      <CrmSummaryProvider initialSummary={initialSummary}>
        <div className="min-h-screen overflow-x-clip bg-[#fcfaf6]">
          <div className="grid min-h-screen md:grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[296px_minmax(0,1fr)]">
            <AppSidebar />

            <div className="relative flex min-w-0 flex-col">
              <AppTopbar currentUser={currentUser} />
              <main className="flex-1 px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] pt-2.5 sm:px-5 sm:pt-3 md:pb-8 md:pt-4 lg:px-8 lg:pb-10 lg:pt-5">
                <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 lg:gap-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>
      </CrmSummaryProvider>
    </AuthRoleProvider>
  );
}
