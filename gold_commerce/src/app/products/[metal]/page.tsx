import { notFound } from "next/navigation";
import type { Metal } from "@/hooks/use-metal-rate";
import { ProductCatalog } from "./product-catalog";

const METALS: Metal[] = ["gold", "silver"];

function isMetal(value: string): value is Metal {
  return (METALS as string[]).includes(value);
}

export function generateStaticParams() {
  return METALS.map((metal) => ({ metal }));
}

export default async function ProductsMetalPage({ params }: { params: Promise<{ metal: string }> }) {
  const { metal } = await params;
  if (!isMetal(metal)) notFound();

  return <ProductCatalog metal={metal} />;
}
