"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { WalletBadge } from "@/components/shared/wallet-badge";
import { useMe, useLogout } from "@/hooks/use-auth";
import type { KycStatus } from "@/types";

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
  const { data: user } = useMe();
  const logout = useLogout();

  const [nomineeName, setNomineeName] = useState("");
  const [nomineeRelation, setNomineeRelation] = useState("");
  const [nomineePhone, setNomineePhone] = useState("");
  const [nomineeNid, setNomineeNid] = useState("");
  const [nomineeSaved, setNomineeSaved] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  const referralCode = user ? `GOLDBD-${user.id.slice(0, 4).toUpperCase()}` : "…";

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
    navigator.clipboard?.writeText(`https://gold.bd/r/${referralCode}`).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Couldn't copy — try again")
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Profile & settings" description="Account, security, and preferences" action={<WalletBadge />} />

      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-gold/10 text-lg font-semibold text-gold">{user ? initials(user.fullName) : "…"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{user?.fullName ?? "…"}</p>
            <p className="text-sm text-muted-foreground">
              {user ? maskPhone(user.phone) : "…"}
              {user?.email ? ` · ${user.email}` : ""}
            </p>
            {user && (
              <Badge variant={KYC_VARIANT[user.kycStatus]} className="mt-1.5">
                {KYC_LABEL[user.kycStatus]}
              </Badge>
            )}
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
            <p className="text-sm text-muted-foreground">0.08g earned from 4 friends · code {referralCode}</p>
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
