"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/session";

/** Fetches an image that requires an `Authorization: Bearer …` header — a
 * plain `<img src>` can't send one — and hands back a local object URL. Used
 * for KYC documents (see kyc-api.ts#kycDocumentUrl), which wallet_server only
 * ever serves to the owning user or an admin, never as a public URL. */
export function useSecureImage(url: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setError(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setError(false);

    const accessToken = getAccessToken();
    fetch(url, {
      credentials: "include",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load image");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { src, error };
}
