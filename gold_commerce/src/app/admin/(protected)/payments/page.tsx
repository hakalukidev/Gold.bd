"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImageIcon, Landmark, Loader2, Wallet, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";
import type { AdminManualPayment } from "@/types";

const METHOD_ICON = { bkash: Wallet, nagad: Wallet, bank: Landmark } as const;
const METHOD_LABEL = { bkash: "bKash", nagad: "Nagad", bank: "Bank transfer" } as const;
const STATUS_FILTERS = ["PENDING", "APPROVED", "DECLINED", "ALL"] as const;

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("PENDING");
  const [declineTarget, setDeclineTarget] = useState<AdminManualPayment | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [proofPayment, setProofPayment] = useState<AdminManualPayment | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-manual-payments", statusFilter],
    queryFn: () => api.get<AdminManualPayment[]>(`/api/admin/manual-payments${statusFilter === "ALL" ? "" : `?status=${statusFilter}`}`),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post<AdminManualPayment>(`/api/admin/manual-payments/${id}/approve`),
    onSuccess: () => {
      toast.success("Payment approved — the customer has been texted a confirmation.");
      queryClient.invalidateQueries({ queryKey: ["admin-manual-payments"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not approve this payment"),
  });

  const decline = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post<AdminManualPayment>(`/api/admin/manual-payments/${id}/decline`, { reason }),
    onSuccess: () => {
      toast.success("Payment declined — the customer has been texted.");
      setDeclineTarget(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-manual-payments"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not decline this payment"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="bKash, Nagad, and bank-transfer orders awaiting review." />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual payment submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : !payments || payments.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments here" description="Submissions will show up as shoppers check out." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const Icon = METHOD_ICON[p.method];
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{p.orderId}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 font-medium">
                            <Icon className="size-3.5" />
                            {METHOD_LABEL[p.method]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{p.customerName}</span> <span className="text-muted-foreground">· {p.customerPhone}</span>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          {p.method === "bank" ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="truncate text-muted-foreground">
                                {p.bankAccountName} · {p.bankAccountNumber} · {p.bankName}
                              </span>
                              {p.hasProofImage && (
                                <button
                                  type="button"
                                  onClick={() => setProofPayment(p)}
                                  className="flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium hover:bg-muted"
                                >
                                  <ImageIcon className="size-3" /> Proof
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {p.senderNumber} · TrxID {p.transactionId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{formatBDT(p.amountBDT)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "APPROVED" ? "default" : p.status === "DECLINED" ? "destructive" : "secondary"}>{p.status}</Badge>
                          {p.status === "DECLINED" && p.declineReason && <p className="mt-1 max-w-[160px] text-[11px] text-muted-foreground">{p.declineReason}</p>}
                        </TableCell>
                        <TableCell>
                          {p.status === "PENDING" ? (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={approve.isPending}
                                onClick={() => approve.mutate(p.id)}
                              >
                                {approve.isPending && approve.variables === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setDeclineTarget(p)}>
                                <X className="size-3.5" />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Reviewed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(declineTarget)} onOpenChange={(open) => !open && setDeclineTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline payment {declineTarget?.orderId}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Reason (shown to the customer via SMS)</label>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              placeholder="e.g. Transaction ID could not be verified"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={decline.isPending || declineReason.trim().length < 3}
              onClick={() => declineTarget && decline.mutate({ id: declineTarget.id, reason: declineReason.trim() })}
            >
              {decline.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(proofPayment)} onOpenChange={(open) => !open && setProofPayment(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Payment proof — {proofPayment?.orderId}</DialogTitle>
          </DialogHeader>
          {proofPayment && (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated, cookie-gated image, not a static asset next/image can optimize
            <img src={`/api/admin/manual-payments/${proofPayment.id}/proof`} alt="Payment proof" className="w-full rounded-md border border-border" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
