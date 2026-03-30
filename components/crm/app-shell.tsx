import { AppSidebar } from "@/components/crm/app-sidebar";
import { AppTopbar } from "@/components/crm/app-topbar";
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
  summary,
}: Readonly<AppShellProps>) {
  return (
    <AuthRoleProvider role={currentUser.appUser?.role}>
      <div className="min-h-screen overflow-x-clip bg-[#fcfaf6]">
        <div className="grid min-h-screen md:grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[296px_minmax(0,1fr)]">
          <AppSidebar summary={summary} />

          <div className="relative flex min-w-0 flex-col">
            <AppTopbar currentUser={currentUser} summary={summary} />
            <main className="flex-1 px-3 pb-8 pt-3 sm:px-5 sm:pt-4 md:pb-8 md:pt-5 lg:px-8 lg:pb-10 lg:pt-6">
              <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 lg:gap-7">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </AuthRoleProvider>
  );
}
