import { NextResponse } from "next/server";

import { handleOpenClawHttpRequest } from "@/features/openclaw/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = await handleOpenClawHttpRequest(request);
  const headers = new Headers({
    "Cache-Control": "no-store",
  });

  if (response.headers) {
    const extraHeaders = new Headers(response.headers);

    extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (response.status === 401) {
    headers.set("WWW-Authenticate", 'Bearer realm="openclaw"');
  }

  return NextResponse.json(response.body, {
    headers,
    status: response.status,
  });
}
