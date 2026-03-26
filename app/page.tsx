import { redirect } from "next/navigation";

import { getCurrentAuthUser } from "@/features/auth/queries";

export default async function HomePage() {
  const authUser = await getCurrentAuthUser();

  redirect(authUser ? "/demandes" : "/login");
}
