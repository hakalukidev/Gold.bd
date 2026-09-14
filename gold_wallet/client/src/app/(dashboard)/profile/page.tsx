"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Copy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { useMe, useLogout } from "@/hooks/use-auth";
import { referralCode, referralLink } from "@/lib/referral";
import { clearSession } from "@/lib/session";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { KycStatus } from "@/types";

// Purely a local preview — there's no `/api/auth/me` upload endpoint in this
// repo (see CLAUDE.md) to actually persist a photo to. Kept in localStorage
// so it survives a refresh, same "no backend" pattern as wherever else this
// app fakes writes.
const AVATAR_STORAGE_KEY = "goldbd-profile-avatar";

const KYC_VARIANT: Record<KycStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_SUBMITTED: "outline",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

const KYC_LABEL_KEY: Record<KycStatus, string> = {
  NOT_SUBMITTED: "profile.kycLabel.notSubmitted",
  PENDING: "profile.kycLabel.pending",
  APPROVED: "profile.kycLabel.approved",
  REJECTED: "profile.kycLabel.rejected",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, -4).replace(/./g, "•")}${phone.slice(-4)}` : phone;
}

// Illustrative — nominee/security/referral state has no backend in this repo
// (see CLAUDE.md), so it lives here as local component state.
export default function ProfilePage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { data } = useMe();
  const logout = useLogout();

  const [nomineeName, setNomineeName] = useState("");
  const [nomineeRelation, setNomineeRelation] = useState("");
  const [nomineePhone, setNomineePhone] = useState("");
  const [nomineeNid, setNomineeNid] = useState("");
  const [nomineeSaved, setNomineeSaved] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const code = data ? referralCode(data.id) : "";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read on mount, not a derived value
      if (saved) setAvatarUrl(saved);
    } catch {
      // localStorage unavailable (private browsing etc.) — just show the fallback initials
    }
  }, []);

  // No real session (or still loading) — UserMenu (mounted alongside every
  // dashboard page) owns the redirect-to-login for the "signed out" case, so
  // just render nothing here rather than a stale demo profile.
  if (!data) return null;
  const user = data;

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires onChange
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("profile.chooseImageFile"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      try {
        localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
      } catch {
        // storage quota/unavailable — the preview still applies for this session
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } finally {
      clearSession();
      router.push("/login");
      router.refresh();
    }
  }

  function saveNominee() {
    if (!nomineeName || !nomineePhone) {
      toast.error(t("profile.nominee.missingFields"));
      return;
    }
    setNomineeSaved(true);
    toast.success(t("profile.nominee.submitted"));
  }

  function copyInviteLink() {
    navigator.clipboard?.writeText(referralLink(user.id)).then(
      () => toast.success(t("profile.referral.copied")),
      () => toast.error(t("profile.referral.copyError"))
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t("profile.header.title")} description={t("profile.header.description")} action={<WalletBadge />} />

      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar size="lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.fullName} />}
              <AvatarFallback className="bg-gold/10 text-lg font-semibold text-gold">{initials(user.fullName)}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="profile-avatar-upload"
              className="absolute -right-1 -bottom-1 flex size-5 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-gold text-ink transition-colors hover:bg-gold-light"
            >
              <Camera className="size-3" strokeWidth={2} />
              <span className="sr-only">{t("profile.uploadPhoto")}</span>
            </label>
            <input
              id="profile-avatar-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">
              {maskPhone(user.phone)}
              {user.email ? ` · ${user.email}` : ""}
            </p>
            <Badge variant={KYC_VARIANT[user.kycStatus]} className="mt-1.5">
              {t(KYC_LABEL_KEY[user.kycStatus])}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{t("profile.nominee.title")}</p>
            <Badge variant={nomineeSaved ? "secondary" : "outline"}>
              {nomineeSaved ? t("profile.nominee.pendingVerification") : t("profile.nominee.notSet")}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder={t("profile.nominee.namePlaceholder")}
            />
            <Input
              value={nomineeRelation}
              onChange={(e) => setNomineeRelation(e.target.value)}
              placeholder={t("profile.nominee.relationPlaceholder")}
            />
            <Input
              value={nomineePhone}
              onChange={(e) => setNomineePhone(e.target.value)}
              placeholder={t("profile.nominee.phonePlaceholder")}
            />
            <Input
              value={nomineeNid}
              onChange={(e) => setNomineeNid(e.target.value)}
              placeholder={t("profile.nominee.nidPlaceholder")}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("profile.nominee.description")}</p>
          <Button variant="gold-solid" onClick={saveNominee}>
            {t("profile.nominee.save")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <p className="font-semibold">{t("profile.security.title")}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("profile.security.twoFactor")}</span>
              <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("profile.security.changePin")}</span>
              <Button variant="link" className="h-auto p-0 text-gold" onClick={() => toast.info(t("profile.comingSoon"))}>
                {t("profile.security.update")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <p className="font-semibold">{t("profile.preferences.title")}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("profile.preferences.appLanguage")}</span>
              <span className="text-sm text-gold">
                {locale === "en" ? t("profile.preferences.languageEnglish") : t("profile.preferences.languageBangla")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t("profile.preferences.linkedPaymentMethods")}</span>
              <Button variant="link" className="h-auto p-0 text-gold" onClick={() => toast.info(t("profile.comingSoon"))}>
                {t("profile.preferences.manage")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        {/* Earnings are illustrative — no referral program/backend in this repo. */}
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{t("profile.referral.title")}</p>
            <p className="text-sm text-muted-foreground">{t("profile.referral.summary", { code })}</p>
          </div>
          <Button variant="gold-solid" onClick={copyInviteLink}>
            <Copy className="size-3.5" />
            {t("profile.referral.share")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("profile.support.needHelp")}</span>
          <Button variant="link" className="h-auto p-0 text-destructive" onClick={handleLogout} disabled={logout.isPending}>
            {logout.isPending ? t("userMenu.loggingOut") : t("userMenu.logOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
