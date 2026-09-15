"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Search, ShieldAlert, Users, type LucideIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { useVisitorStats } from "@/hooks/use-visitor-stats";
import { periodCutoffs } from "@/lib/date-buckets";
import { formatBDT, formatDateTime } from "@/lib/format";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This week" },
  { key: "thisMonth", label: "This month" },
  { key: "thisYear", label: "This year" },
  { key: "allTime", label: "All time" },
] as const;

function PeriodStatsRow({
  icon,
  counts,
}: {
  icon: LucideIcon;
  counts: Record<(typeof PERIODS)[number]["key"], number> | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {PERIODS.map((p) => (
        <StatCard className="admin-stat" key={p.key} icon={icon} label={p.label} value={counts?.[p.key] ?? 0} />
      ))}
    </div>
  );
}

interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: "USER" | "ADMIN";
  kycStatus: string;
  createdAt: string;
  cashBalanceBDT: string;
  goldBalanceGrams: string;
}

interface PendingKyc {
  id: string;
  nidNumber: string;
  documentUrls: string[];
  user: { fullName: string; phone: string };
}

function PendingKycReview() {
  const queryClient = useQueryClient();
  const { data: pending } = useQuery({
    queryKey: ["admin-kyc-pending"],
    queryFn: () => api.get<PendingKyc[]>("/api/admin/kyc"),
  });

  const review = useMutation({
    mutationFn: (input: { kycProfileId: string; decision: "APPROVED" | "REJECTED" }) =>
      api.patch("/api/admin/kyc", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Review failed"),
  });

  if (!pending || pending.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4.5 text-gold" strokeWidth={1.75} />
          Pending KYC review
          <Badge variant="secondary">{pending.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{p.user.fullName} Â· {p.user.phone}</p>
              <p className="text-sm text-muted-foreground">NID: {p.nidNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => review.mutate({ kycProfileId: p.id, decision: "APPROVED" })}
                disabled={review.isPending}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => review.mutate({ kycProfileId: p.id, decision: "REJECTED" })}
                disabled={review.isPending}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/api/admin/users"),
  });
  const { data: visitorStats } = useVisitorStats();
  const filteredUsers = users?.filter((user) => `${user.fullName} ${user.phone} ${user.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  // Real counts bucketed from each user's actual createdAt â€” currently all
  // zero because /api/admin/users has no backend behind it yet (see
  // CLAUDE.md), not because this is fake data. Once that endpoint returns
  // real users, these numbers are correct without any further change here.
  const userCounts = useMemo(() => {
    if (!users) return undefined;
    const cutoffs = periodCutoffs();
    const counts = { today: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, allTime: users.length };
    for (const u of users) {
      const createdAt = new Date(u.createdAt).getTime();
      if (createdAt >= cutoffs.today) counts.today++;
      if (createdAt >= cutoffs.thisWeek) counts.thisWeek++;
      if (createdAt >= cutoffs.thisMonth) counts.thisMonth++;
      if (createdAt >= cutoffs.thisYear) counts.thisYear++;
    }
    return counts;
  }, [users]);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Understand your audience and manage customer accounts." action={<span className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">Customer management</span>} />

      <div className="space-y-3">
        <h2 className="admin-section-heading flex items-center font-semibold">
          <Eye className="size-3.5" strokeWidth={1.75} />
          Site visitors (unique)
        </h2>
        <PeriodStatsRow icon={Eye} counts={visitorStats?.uniqueVisitors} />
      </div>

      <div className="space-y-3">
        <h2 className="admin-section-heading flex items-center font-semibold">
          <Users className="size-3.5" strokeWidth={1.75} />
          New accounts
        </h2>
        <PeriodStatsRow icon={Users} counts={userCounts} />
      </div>

      <PendingKycReview />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><CardTitle>Customer directory {users && <Badge variant="secondary" className="ml-2">{users.length}</Badge>}</CardTitle><p className="mt-1.5 text-xs text-muted-foreground">Account details, verification, and balances.</p></div>
            <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search customers" placeholder="Search name, phone or email" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <div className="admin-directory-empty text-center"><EmptyState icon={ShieldAlert} title="Customer accounts are unavailable" description="We couldn't load the customer directory. Please try again." /><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>
          ) : !filteredUsers || filteredUsers.length === 0 ? (
            <div className="admin-directory-empty"><EmptyState icon={Users} title={search ? "No matching customers" : "No customers yet"} description={search ? "Try another name, phone number, or email." : "Customer accounts will appear here when they become available."} /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.phone}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>{u.kycStatus.replace("_", " ")}</TableCell>
                      <TableCell>{formatBDT(u.cashBalanceBDT)}</TableCell>
                      <TableCell>{u.goldBalanceGrams} g</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(u.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
