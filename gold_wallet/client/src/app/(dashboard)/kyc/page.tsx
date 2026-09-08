"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, ImagePlus, XCircle, type LucideIcon } from "lucide-react";
import { submitKycSchema, type SubmitKycInput } from "@/lib/validations/kyc";
import { api, ApiError } from "@/lib/api-client";
import { useMe } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";

interface KycProfile {
  id: string;
  nidNumber: string;
  documentUrls: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
}

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

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

/** Dashed upload tile — file upload isn't wired up in this scaffold (no
 * storage backend), so this collects a hosted image URL instead, styled to
 * match the reference design's upload tiles. */
function UploadUrlTile({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ImagePlus className="size-4" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium">{label}</p>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("kyc.uploadPlaceholder")}
        className="text-center text-xs"
      />
    </div>
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
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: user } = useMe();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [nidFrontUrl, setNidFrontUrl] = useState("");
  const [nidBackUrl, setNidBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");

  const [nidNumber, setNidNumber] = useState("");

  const submit = useMutation({
    mutationFn: (values: SubmitKycInput) => api.post("/api/kyc", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  async function handleSubmit() {
    const documentUrls = [nidFrontUrl, nidBackUrl, selfieUrl].filter(Boolean);
    const parsed = submitKycSchema.safeParse({ nidNumber, documentUrls });
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
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("kyc.nidStep.title")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <UploadUrlTile label={t("kyc.nidStep.front")} value={nidFrontUrl} onChange={setNidFrontUrl} />
                <UploadUrlTile label={t("kyc.nidStep.back")} value={nidBackUrl} onChange={setNidBackUrl} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("kyc.selfieStep.title")}</h2>
              <UploadUrlTile label={t("kyc.selfieStep.uploadLabel")} value={selfieUrl} onChange={setSelfieUrl} />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              {t("kyc.back")}
            </Button>
            {step < STEP_KEYS.length ? (
              <Button
                type="button"
                variant="gold-solid"
                disabled={step === 2 && !nidNumberValid}
                onClick={() => setStep((s) => s + 1)}
              >
                {t("kyc.continue")}
              </Button>
            ) : (
              <Button type="button" variant="gold-solid" disabled={submit.isPending} onClick={handleSubmit}>
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
  const { data: profile } = useQuery({
    queryKey: ["kyc"],
    queryFn: () => api.get<KycProfile | null>("/api/kyc"),
  });

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
