"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateDeadlineDialog } from "@/features/deadlines/components/create-deadline-dialog";
import { CreateDocumentDialog } from "@/features/documents/components/create-document-dialog";
import { CreateOrderDialog } from "@/features/orders/components/create-order-dialog";
import { CreateProductionDialog } from "@/features/productions/components/create-production-dialog";
import { CreateRequestDialog } from "@/features/requests/components/create-request-dialog";
import type { RequestFormOptions, RequestLinkOption } from "@/features/requests/types";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { CreateValidationDialog } from "@/features/validations/components/create-validation-dialog";
import type { ProductionFormOptions } from "@/features/productions/types";
import type { DocumentFormOptions } from "@/features/documents/types";
import type { RequestAssigneeOption } from "@/features/requests/types";
import type { ValidationFormOptions } from "@/features/validations/types";

export function ManualCreatePanel({
  assignees,
  assigneesError = null,
  deadlineRequestOptions,
  deadlineRequestOptionsError = null,
  documentOptions,
  documentOptionsError = null,
  productionOptions,
  productionOptionsError = null,
  requestFormOptions,
  requestFormOptionsError = null,
  requestOptions,
  requestOptionsError = null,
  validationOptions,
  validationOptionsError = null,
}: Readonly<{
  assignees: RequestAssigneeOption[];
  assigneesError?: string | null;
  deadlineRequestOptions: RequestLinkOption[];
  deadlineRequestOptionsError?: string | null;
  documentOptions: DocumentFormOptions;
  documentOptionsError?: string | null;
  productionOptions: ProductionFormOptions;
  productionOptionsError?: string | null;
  requestFormOptions: RequestFormOptions;
  requestFormOptionsError?: string | null;
  requestOptions: RequestLinkOption[];
  requestOptionsError?: string | null;
  validationOptions: ValidationFormOptions;
  validationOptionsError?: string | null;
}>) {
  return (
    <Card>
      <CardHeader className="space-y-3 border-b border-black/[0.06] pb-5">
        <CardTitle>Création manuelle</CardTitle>
        <CardDescription>
          Point d’entrée unique pour ouvrir rapidement un objet métier sans attendre un flux automatique.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CreateRequestDialog
          options={requestFormOptions}
          optionsError={requestFormOptionsError}
        />
        <CreateTaskDialog
          assignees={assignees}
          assigneesError={assigneesError}
          requestOptions={requestOptions}
          requestOptionsError={requestOptionsError}
        />
        <CreateDeadlineDialog
          requestOptions={deadlineRequestOptions}
          requestOptionsError={deadlineRequestOptionsError}
        />
        <CreateProductionDialog
          options={productionOptions}
          optionsError={productionOptionsError}
        />
        <CreateOrderDialog
          options={productionOptions}
          optionsError={productionOptionsError}
        />
        <CreateValidationDialog
          options={validationOptions}
          optionsError={validationOptionsError}
        />
        <CreateDocumentDialog
          options={documentOptions}
          optionsError={documentOptionsError}
        />
      </CardContent>
    </Card>
  );
}
