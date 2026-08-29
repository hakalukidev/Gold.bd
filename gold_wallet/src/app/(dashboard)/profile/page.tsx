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
import { MOCK_USER } from "@/lib/mock-user";
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

const KYC_LABEL: Record<KycStatus, string> = {
  NOT_SUBMITTED: "Not verified",
  PENDING: "KYC Pending",
  APPROVED: "KYC Verified",
  REJECTED: "KYC Rejected",
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
  const { data } = useMe();
  const user = data ?? MOCK_USER;
  const logout = useLogout();

  const [nomineeName, setNomineeName] = useState("");
  const [nomineeRelation, setNomineeRelation] = useState("");
  const [nomineePhone, setNomineePhone] = useState("");
  const [nomineeNid, setNomineeNid] = useState("");
  const [nomineeSaved, setNomineeSaved] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const code = referralCode(user.id);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read on mount, not a derived value
      if (saved) setAvatarUrl(saved);
    } catch {
      // localStorage unavailable (private browsing etc.) — just show the fallback initials
    }
  }, []);

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires onChange
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
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
    await logout.mutateAsync();
    router.push("/login");
    router.refresh();
  }

  function saveNominee() {
    if (!nomineeName || !nomineePhone) {
      toast.error("Enter at least the nominee's name and phone number");
      return;
    }
    setNomineeSaved(true);
    toast.success("Nominee details submitted for verification");
  }

  function copyInviteLink() {
    navigator.clipboard?.writeText(referralLink(user.id)).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Couldn't copy — try again")
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Profile & settings" description="Account, security, and preferences" action={<WalletBadge />} />

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
              <span className="sr-only">Upload profile photo</span>
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
              {KYC_LABEL[user.kycStatus]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Nominee details</p>
            <Badge variant={nomineeSaved ? "secondary" : "outline"}>{nomineeSaved ? "Pending Verification" : "Not set"}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} placeholder="Nominee name" />
            <Input value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} placeholder="Relationship" />
            <Input value={nomineePhone} onChange={(e) => setNomineePhone(e.target.value)} placeholder="Nominee phone" />
            <Input value={nomineeNid} onChange={(e) => setNomineeNid(e.target.value)} placeholder="Nominee NID" />
          </div>
          <p className="text-xs text-muted-foreground">
            Your nominee will inherit your gold holdings and vaulted assets. Details are verified by our team before approval.
          </p>
          <Button variant="gold-solid" onClick={saveNominee}>
            Save &amp; submit for verification
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <p className="font-semibold">Security</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Two-factor authentication</span>
              <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Change PIN</span>
              <Button variant="link" className="h-auto p-0 text-gold" onClick={() => toast.info("Coming soon")}>
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <p className="font-semibold">Preferences</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">App language</span>
              <span className="text-sm text-gold">English</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Linked payment methods</span>
              <Button variant="link" className="h-auto p-0 text-gold" onClick={() => toast.info("Coming soon")}>
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        {/* Earnings are illustrative — no referral program/backend in this repo. */}
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Referral rewards</p>
            <p className="text-sm text-muted-foreground">0.08g earned from 4 friends · code {code}</p>
          </div>
          <Button variant="gold-solid" onClick={copyInviteLink}>
            <Copy className="size-3.5" />
            Share invite link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Need help? Visit Support Center</span>
          <Button variant="link" className="h-auto p-0 text-destructive" onClick={handleLogout} disabled={logout.isPending}>
            {logout.isPending ? "Logging out…" : "Log out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
