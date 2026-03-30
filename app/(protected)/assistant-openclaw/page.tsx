import type { Metadata } from "next";

import { AssistantReadyActionsPanel } from "@/features/openclaw/components/assistant-ready-actions-panel";
import { OpenClawTestConsole } from "@/features/openclaw/components/openclaw-test-console";
import { getOpenClawActionDescriptors } from "@/features/openclaw/integration";
import { getAssistantReadyWorkspaceData } from "@/features/openclaw/crm-actions";

export const metadata: Metadata = {
  title: "Assistant OpenClaw",
};

export const dynamic = "force-dynamic";

export default async function AssistantOpenclawPage() {
  const [data, descriptors] = await Promise.all([
    getAssistantReadyWorkspaceData(),
    Promise.resolve(getOpenClawActionDescriptors()),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AssistantReadyActionsPanel data={data} />
      <OpenClawTestConsole actions={descriptors} />
    </div>
  );
}
