import type { Metadata } from "next";

import { TasksPage } from "@/features/tasks/components/tasks-page";
import { getTasksPageData } from "@/features/tasks/queries";

export const metadata: Metadata = {
  title: "Tâches",
};

export const dynamic = "force-dynamic";

interface TasksRoutePageProps {
  searchParams?: Promise<{
    requestId?: string;
  }>;
}

export default async function TasksRoutePage({
  searchParams,
}: Readonly<TasksRoutePageProps>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await getTasksPageData();

  return (
    <TasksPage
      tasks={data.tasks}
      assignees={data.assignees}
      assigneesError={data.assigneesError}
      requestOptions={data.requestOptions}
      requestOptionsError={data.requestOptionsError}
      error={data.error}
      preselectedRequestId={resolvedSearchParams.requestId ?? null}
    />
  );
}
