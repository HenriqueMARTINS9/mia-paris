import type { Metadata } from "next";

import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { getDashboardPageData } from "@/features/dashboard/queries";
import { getDocumentFormOptions } from "@/features/documents/queries";
import { getProductionFormOptions } from "@/features/productions/queries";
import {
  getRequestAssigneeOptions,
  getRequestFormOptions,
  getRequestLinkOptions,
} from "@/features/requests/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardRoutePage() {
  const [
    data,
    requestFormOptionsResult,
    assigneesResult,
    requestOptionsResult,
    productionOptionsResult,
    documentOptionsResult,
  ] = await Promise.all([
    getDashboardPageData(),
    getRequestFormOptions(),
    getRequestAssigneeOptions(),
    getRequestLinkOptions(),
    getProductionFormOptions(),
    getDocumentFormOptions(),
  ]);

  return (
    <DashboardPage
      data={data}
      assignees={assigneesResult.assignees}
      assigneesError={assigneesResult.error}
      deadlineRequestOptions={requestOptionsResult.options}
      deadlineRequestOptionsError={requestOptionsResult.error}
      documentOptions={documentOptionsResult.options}
      documentOptionsError={documentOptionsResult.error}
      productionOptions={productionOptionsResult.options}
      productionOptionsError={productionOptionsResult.error}
      requestFormOptions={requestFormOptionsResult.options}
      requestFormOptionsError={requestFormOptionsResult.error}
      requestOptions={requestOptionsResult.options}
      requestOptionsError={requestOptionsResult.error}
      validationOptions={{
        assignees: assigneesResult.assignees,
        productionOptions: productionOptionsResult.options,
      }}
      validationOptionsError={
        [assigneesResult.error, productionOptionsResult.error]
          .filter(Boolean)
          .join(" · ") || null
      }
    />
  );
}
