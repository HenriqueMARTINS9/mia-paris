import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/crm/error-state";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { TaskDetailPanel } from "@/features/tasks/components/task-detail-panel";
import { getTaskDetailPageData } from "@/features/tasks/queries";

interface TaskDetailRoutePageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Détail tâche",
};

export const dynamic = "force-dynamic";

export default async function TaskDetailRoutePage({
  params,
}: Readonly<TaskDetailRoutePageProps>) {
  const { id } = await params;
  const data = await getTaskDetailPageData(id);

  if (data.error) {
    return (
      <ErrorState
        title="Connexion Supabase impossible pour la tâche"
        description={data.error}
      />
    );
  }

  if (!data.task) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Fiche tâche"
        title={data.task.title}
        badge={data.task.clientName}
        description={data.task.requestTitle}
        actions={
          <Button asChild variant="outline">
            <Link href="/taches">
              <ArrowLeft className="h-4 w-4" />
              Retour Tâches
            </Link>
          </Button>
        }
      />

      <TaskDetailPanel
        task={data.task}
        assignees={data.assignees}
        assigneesError={data.assigneesError}
        mode="page"
      />
    </div>
  );
}
