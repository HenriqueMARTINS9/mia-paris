import { AppSidebar } from "@/components/crm/app-sidebar";
import { AppTopbar } from "@/components/crm/app-topbar";
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
    <div className="min-h-screen overflow-x-clip">
      <div className="grid min-h-screen md:grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        <AppSidebar summary={summary} />

        <div className="flex min-w-0 flex-col">
          <AppTopbar currentUser={currentUser} summary={summary} />
          <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 lg:gap-7">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
