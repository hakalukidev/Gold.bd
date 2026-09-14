"use client";

import { ImageOff } from "lucide-react";
import { useSecureImage } from "@/hooks/use-secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** <img> that fetches its source with the signed-in user's access token
 * attached — for KYC document images, which wallet_server refuses to serve
 * without one (see use-secure-image.ts). */
export function SecureImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const { src, error } = useSecureImage(url);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="size-5" strokeWidth={1.75} />
      </div>
    );
  }

  if (!src) {
    return <Skeleton className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- next/image can't take a blob: object URL as its src
  return <img src={src} alt={alt} className={cn("object-cover", className)} />;
}
