import { NextResponse } from "next/server";

import { getCurrentAuthUser } from "@/features/auth/queries";
import { getCrmSummary } from "@/lib/data/crm";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    return NextResponse.json(
      { error: "Session utilisateur introuvable." },
      { status: 401 },
    );
  }

  const summary = await getCrmSummary();

  return NextResponse.json({ summary });
}
