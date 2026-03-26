import type { Metadata } from "next";

import { ProductionsPage } from "@/features/productions/components/productions-page";
import { getProductionsPageData } from "@/features/productions/queries";

export const metadata: Metadata = {
  title: "Productions",
};

export const dynamic = "force-dynamic";

export default async function ProductionsRoutePage() {
  const data = await getProductionsPageData();

  return (
    <ProductionsPage productions={data.productions} error={data.error} />
  );
}
