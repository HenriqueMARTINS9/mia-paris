import { NextResponse } from "next/server";

import {
  executeOpenClawAction,
  getOpenClawActionDescriptors,
  type OpenClawActionEnvelope,
} from "@/features/openclaw/integration";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as OpenClawActionEnvelope | null;

  if (!body?.action) {
    return NextResponse.json(
      {
        action: null,
        code: "validation_error",
        data: null,
        kind: "read",
        message: "Action OpenClaw manquante dans la requête.",
        ok: false,
      },
      { status: 400 },
    );
  }

  const descriptors = getOpenClawActionDescriptors();
  const descriptor = descriptors.find(
    (item) => item.action === body.action && item.enabled,
  );

  if (!descriptor) {
    return NextResponse.json(
      {
        action: body.action,
        code: "forbidden",
        data: null,
        kind: "write",
        message:
          "Cette action n’est pas encore exposée à OpenClaw ou reste réservée à une ouverture future.",
        ok: false,
      },
      { status: 403 },
    );
  }

  const result = await executeOpenClawAction(body);

  return NextResponse.json(result, {
    status: result.ok
      ? 200
      : result.code === "forbidden"
        ? 403
        : result.code === "validation_error"
          ? 400
          : 422,
  });
}
