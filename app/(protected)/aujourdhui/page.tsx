import type { Metadata } from "next";

import { TodayOverviewPage } from "@/features/today/components/today-overview-page";
import { getTodayOverviewData } from "@/features/today/queries";
import { getDocumentFormOptions } from "@/features/documents/queries";
import { getNotificationPreferencesState } from "@/features/notifications/queries";
import {
  getRequestAssigneeOptions,
  getRequestFormOptions,
  getRequestLinkOptions,
} from "@/features/requests/queries";

export const metadata: Metadata = {
  title: "Aujourd’hui",
};

export const dynamic = "force-dynamic";

export default async function TodayRoutePage() {
  const [
    data,
    requestFormOptionsResult,
    assigneesResult,
    requestOptionsResult,
    documentOptionsResult,
    notificationPreferencesState,
  ] = await Promise.all([
    getTodayOverviewData(),
    getRequestFormOptions(),
    getRequestAssigneeOptions(),
    getRequestLinkOptions(),
    getDocumentFormOptions(),
    getNotificationPreferencesState(),
  ]);

  return (
    <TodayOverviewPage
      assignees={assigneesResult.assignees}
      assigneesError={assigneesResult.error}
      data={data}
      deadlineRequestOptions={requestOptionsResult.options}
      deadlineRequestOptionsError={requestOptionsResult.error}
      documentOptions={documentOptionsResult.options}
      documentOptionsError={documentOptionsResult.error}
      notificationPreferencesState={notificationPreferencesState}
      requestFormOptions={requestFormOptionsResult.options}
      requestFormOptionsError={requestFormOptionsResult.error}
      requestOptions={requestOptionsResult.options}
      requestOptionsError={requestOptionsResult.error}
    />
  );
}
