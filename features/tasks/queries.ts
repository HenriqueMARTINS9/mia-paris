import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getRequestAssigneeOptions, getRequestLinkOptions } from "@/features/requests/queries";
import { mapTaskOverviewToListItem, mapTaskRecordToListItemFallback } from "@/features/tasks/mappers";
import type { TaskListItem, TasksPageData } from "@/features/tasks/types";
import { supabaseRestSelectList, supabaseRestSelectMaybeSingle } from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { RequestOverview, TaskOpen, TaskRecord } from "@/types/crm";

export async function getTasksPageData(): Promise<TasksPageData> {
  noStore();

  if (!hasSupabaseEnv) {
    return {
      tasks: [],
      assignees: [],
      assigneesError: null,
      requestOptions: [],
      requestOptionsError: null,
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        tasks: [],
        assignees: [],
        assigneesError: null,
        requestOptions: [],
        requestOptionsError: null,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux tâches.",
      };
    }

    const [tasksResult, assigneesResult, requestOptionsResult] = await Promise.all([
      supabase
        .from("v_tasks_open")
        .select("*")
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false })
        .order("title", { ascending: true }),
      getRequestAssigneeOptions(),
      getRequestLinkOptions(),
    ]);

    if (tasksResult.error) {
      return {
        tasks: [],
        assignees: assigneesResult.assignees,
        assigneesError: assigneesResult.error,
        requestOptions: requestOptionsResult.options,
        requestOptionsError: requestOptionsResult.error,
        error: `Impossible de charger les tâches: ${tasksResult.error.message}`,
      };
    }

    const taskRows = (tasksResult.data ?? []) as TaskOpen[];
    const taskRecords = await getTaskRecordsByIds(taskRows.map((task) => task.id));
    const taskRecordsById = new Map(
      taskRecords.map((taskRecord) => [taskRecord.id, taskRecord]),
    );
    const requestOptionsById = new Map(
      requestOptionsResult.options.map((option) => [option.id, option]),
    );

    return {
      tasks: taskRows.map((taskRow) =>
        mapTaskOverviewToListItem({
          requestOptionsById,
          taskRecord: taskRecordsById.get(taskRow.id) ?? null,
          taskRow,
        }),
      ),
      assignees: assigneesResult.assignees,
      assigneesError: assigneesResult.error,
      requestOptions: requestOptionsResult.options,
      requestOptionsError: requestOptionsResult.error,
      error: null,
    };
  } catch (error) {
    return {
      tasks: [],
      assignees: [],
      assigneesError: null,
      requestOptions: [],
      requestOptionsError: null,
      error:
        error instanceof Error
          ? `Impossible de charger les tâches: ${error.message}`
          : "Impossible de charger les tâches.",
    };
  }
}

export async function getTaskDetailPageData(taskId: string): Promise<{
  assignees: TasksPageData["assignees"];
  assigneesError: string | null;
  error: string | null;
  task: TaskListItem | null;
}> {
  noStore();

  try {
    const [taskRecordResult, assigneesResult, requestOptionsResult] =
      await Promise.all([
        supabaseRestSelectMaybeSingle<TaskRecord>("tasks", {
          id: `eq.${taskId}`,
          select:
            "id,title,task_type,status,priority,request_id,assigned_user_id,due_at,created_at,updated_at",
        }),
        getRequestAssigneeOptions(),
        getRequestLinkOptions(),
      ]);

    if (taskRecordResult.error) {
      return {
        assignees: assigneesResult.assignees,
        assigneesError: assigneesResult.error,
        error: `Impossible de charger la tâche: ${taskRecordResult.error}`,
        task: null,
      };
    }

    if (!taskRecordResult.data) {
      return {
        assignees: assigneesResult.assignees,
        assigneesError: assigneesResult.error,
        error: null,
        task: null,
      };
    }

    const requestId = taskRecordResult.data.request_id;
    const [taskViewResult, requestResult] = await Promise.all([
      getTaskViewRow(taskId),
      requestId
        ? getRequestViewRow(requestId)
        : Promise.resolve<RequestOverview | null>(null),
    ]);
    const requestOptionsById = new Map(
      requestOptionsResult.options.map((option) => [option.id, option]),
    );
    const fromView = taskViewResult
      ? mapTaskOverviewToListItem({
          requestOptionsById,
          taskRecord: taskRecordResult.data,
          taskRow: taskViewResult,
        })
      : null;

    return {
      assignees: assigneesResult.assignees,
      assigneesError: assigneesResult.error,
      error: null,
      task:
        fromView ??
        mapTaskRecordToListItemFallback({
          requestLabel: requestId ? requestOptionsById.get(requestId)?.label ?? null : null,
          requestTitle: requestResult?.title ?? null,
          taskRecord: taskRecordResult.data,
        }),
    };
  } catch (error) {
    return {
      assignees: [],
      assigneesError: null,
      error:
        error instanceof Error
          ? `Impossible de charger la tâche: ${error.message}`
          : "Impossible de charger la tâche.",
      task: null,
    };
  }
}

async function getTaskRecordsByIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return [] as TaskRecord[];
  }

  const result = await supabaseRestSelectList<TaskRecord>("tasks", {
    id: buildInFilter(taskIds),
    select:
      "id,title,task_type,status,priority,request_id,assigned_user_id,due_at,created_at,updated_at",
  });

  return result.data ?? [];
}

async function getTaskViewRow(taskId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("v_tasks_open")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  return data;
}

async function getRequestViewRow(requestId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("v_requests_overview")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  return data;
}

function buildInFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}
