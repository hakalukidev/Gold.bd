"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, ImagePlus, XCircle, type LucideIcon } from "lucide-react";
import { submitKycSchema } from "@/lib/validations/kyc";
import { ApiError } from "@/lib/api-client";
import type { KycProfile } from "@/lib/kyc-api";
import { useMe } from "@/hooks/use-auth";
import { useKycStatus, useSubmitKyc } from "@/hooks/use-kyc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

const statusIcon: Record<KycProfile["status"], LucideIcon> = {
  APPROVED: CheckCircle2,
  PENDING: Clock,
  REJECTED: XCircle,
};

const STATUS_LABEL_KEY: Record<KycProfile["status"], string> = {
  APPROVED: "kyc.status.approved",
  PENDING: "kyc.status.pending",
  REJECTED: "kyc.status.rejected",
};

const STEP_KEYS = ["kyc.steps.phone", "kyc.steps.details", "kyc.steps.nid", "kyc.steps.selfie"] as const;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

/** Real file-picker tile — clicking anywhere opens the native file dialog
 * (a <label>/hidden-<input> pair, same pattern as the avatar uploader on
 * /profile), with a live preview of whatever was picked. */
function UploadFileTile({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // picking the same file again should still fire onChange
    if (!picked) return;
    if (!ALLOWED_IMAGE_TYPES.has(picked.type)) {
      toast.error(t("kyc.invalidFileType"));
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      toast.error(t("kyc.fileTooLarge"));
      return;
    }
    onChange(picked);
  }

  return (
    <label
      htmlFor={inputId}
      className="group flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border p-4 text-center transition-colors hover:border-gold/50"
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview of a just-picked file, not a servable asset
        <img src={previewUrl} alt={label} className="h-20 w-full rounded-sm object-cover" />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:text-gold">
          <ImagePlus className="size-4" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm font-medium">{label}</p>
      <p className="truncate text-xs text-muted-foreground">{file ? file.name : t("kyc.uploadHint")}</p>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </label>
  );
}

/** Decorative 4-box code entry for the phone-confirmation step — the
 * account's phone is already OTP-verified at registration (see
 * (auth)/verify-otp), so there's no separate endpoint to check this against;
 * it doesn't gate "Continue", it's just the visual the reference design uses. */
function OtpBoxes() {
  const [digits, setDigits] = useState(["", "", "", ""]);

  return (
    <div className="flex justify-center gap-3">
      {digits.map((d, i) => (
        <Input
          key={i}
          value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            setDigits((prev) => prev.map((p, idx) => (idx === i ? v : p)));
            if (v && i < digits.length - 1) {
              (document.getElementById(`kyc-otp-${i + 1}`) as HTMLInputElement | null)?.focus();
            }
          }}
          id={`kyc-otp-${i}`}
          inputMode="numeric"
          maxLength={1}
          className="h-14 w-14 text-center text-xl font-semibold"
        />
      ))}
    </div>
  );
}

function VerifyWizard({ prefillReason }: { prefillReason?: string }) {
  const { t } = useTranslation();
  const { data: user } = useMe();
  const submit = useSubmitKyc();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [nidFront, setNidFront] = useState<File | null>(null);
  const [nidBack, setNidBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  async function handleSubmit() {
    const parsed = submitKycSchema.safeParse({ fullName, dob, nidNumber, nidFront, nidBack, selfie });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("kyc.checkDetails"));
      return;
    }
    try {
      await submit.mutateAsync(parsed.data);
      toast.success(t("kyc.submitted"));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("kyc.submissionFailed"));
    }
  }

  const nidNumberValid = submitKycSchema.shape.nidNumber.safeParse(nidNumber).success;
  const detailsValid = nidNumberValid && fullName.trim().length >= 2;
  const documentsValid = !!nidFront && !!nidBack;

  const canContinue = step === 2 ? detailsValid : step === 3 ? documentsValid : true;

  return (
    <div className="space-y-6">
      <PageHeader title={t("kyc.header.title")} description={t("kyc.header.description")} action={<WalletBadge />} />

      {/* Step progress */}
      <div className="flex gap-1.5">
        {STEP_KEYS.map((labelKey, i) => (
          <div key={labelKey} className={cn("h-1.5 flex-1 rounded-full", i + 1 <= step ? "bg-gold" : "bg-muted")} />
        ))}
      </div>

      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("kyc.stepOf", { step, total: STEP_KEYS.length })}
          </p>

          {prefillReason && step === 1 && <p className="text-sm text-destructive">{prefillReason}</p>}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("kyc.phoneStep.title")}</h2>
              <p className="text-sm text-muted-foreground">{user ? maskPhone(user.phone) : "…"}</p>
              <OtpBoxes />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("kyc.detailsStep.title")}</h2>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-name">{t("kyc.detailsStep.fullName")}</Label>
                <Input
                  id="kyc-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("kyc.detailsStep.fullName")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kyc-dob">{t("kyc.detailsStep.dob")}</Label>
                  <Input id="kyc-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kyc-nid">{t("kyc.detailsStep.nidNumber")}</Label>
                  <Input
                    id="kyc-nid"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="1234567890"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("kyc.nidStep.title")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <UploadFileTile label={t("kyc.nidStep.front")} file={nidFront} onChange={setNidFront} />
                <UploadFileTile label={t("kyc.nidStep.back")} file={nidBack} onChange={setNidBack} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("kyc.selfieStep.title")}</h2>
              <UploadFileTile label={t("kyc.selfieStep.uploadLabel")} file={selfie} onChange={setSelfie} />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              {t("kyc.back")}
            </Button>
            {step < STEP_KEYS.length ? (
              <Button type="button" variant="gold-solid" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                {t("kyc.continue")}
              </Button>
            ) : (
              <Button type="button" variant="gold-solid" disabled={!selfie || submit.isPending} onClick={handleSubmit}>
                {submit.isPending ? t("kyc.submitting") : t("kyc.submitForReview")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function KycPage() {
  const { t } = useTranslation();
  const { data: profile } = useKycStatus();

  if (profile && profile.status !== "REJECTED") {
    const StatusIcon = statusIcon[profile.status];
    return (
      <div className="space-y-6">
        <PageHeader title={t("kyc.header.title")} description={t("kyc.header.description")} action={<WalletBadge />} />
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
              <StatusIcon className="size-4.5" strokeWidth={1.75} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{t("kyc.status.title")}</p>
                <Badge variant={profile.status === "APPROVED" ? "default" : "secondary"}>
                  {t(STATUS_LABEL_KEY[profile.status])}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("kyc.nidLabel", { number: profile.nidNumber })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <VerifyWizard
      prefillReason={
        profile?.status === "REJECTED"
          ? t("kyc.previousRejected", { reason: profile.rejectReason ?? t("kyc.noReasonGiven") })
          : undefined
      }
    />
  );
}
