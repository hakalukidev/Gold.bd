"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { Camera, RefreshCw, Upload, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Live "what it'll look like on the coin" preview for the gift panel's
 * custom-photo add-on: pick a photo, see it framed in a gold coin bezel,
 * swap it for another as many times as needed. Purely a client-side preview
 * — there's no physical minting/fulfillment backend in this app (same "no
 * fulfillment" scope as checkout/gift itself, see gift-gold-panel.tsx), so
 * the photo is never uploaded anywhere; it only ever exists as an in-memory
 * object URL for this preview. */
export function CoinPhotoUpload({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // picking the same file again should still fire onChange
    if (!picked) return;
    if (!ALLOWED_TYPES.has(picked.type)) {
      toast.error(t("giftGoldPanel.customPhoto.invalidType"));
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error(t("giftGoldPanel.customPhoto.tooLarge"));
      return;
    }
    onChange(picked);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border p-4">
      <div className="relative">
        {/* Gold bezel ring, mimicking a minted coin's raised edge. */}
        <div className="flex size-32 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-[#a37f1c] p-[6px] shadow-[0_4px_16px_rgba(212,166,42,0.35)]">
          <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-black/15">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview of a just-picked file, not a servable asset
              <img src={previewUrl} alt={t("giftGoldPanel.customPhoto.previewAlt")} className="size-full object-cover" />
            ) : (
              <Camera className="size-8 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t("giftGoldPanel.customPhoto.remove")}
            className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-destructive/15 text-destructive hover:bg-destructive/25"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gold hover:underline">
        {previewUrl ? <RefreshCw className="size-3.5" strokeWidth={2} /> : <Upload className="size-3.5" strokeWidth={2} />}
        {previewUrl ? t("giftGoldPanel.customPhoto.change") : t("giftGoldPanel.customPhoto.upload")}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePick} />
      </label>
      <p className="max-w-56 text-center text-[11px] text-muted-foreground">{t("giftGoldPanel.customPhoto.previewNote")}</p>
    </div>
  );
}
