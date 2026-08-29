"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";

interface AdminTransaction {
  id: string;
  type: string;
  status: string;
  goldGrams: string | null;
  pricePerGramBDT: string | null;
  totalAmountBDT: string;
  createdAt: string;
  user: { fullName: string; phone: string };
}

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => api.get<AdminTransaction[]>("/api/admin/transactions"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Every buy, sell, deposit, and withdrawal across all users." />
      <Card>
        <CardHeader>
          <CardTitle>All transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <EmptyState icon={History} title="No transactions yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{t.user.fullName}</span>{" "}
                        <span className="text-muted-foreground">· {t.user.phone}</span>
                      </TableCell>
                      <TableCell className="font-medium">{t.type}</TableCell>
                      <TableCell>{t.goldGrams ? `${t.goldGrams} g` : "—"}</TableCell>
                      <TableCell className="font-medium">{formatBDT(t.totalAmountBDT)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.status === "COMPLETED" ? "default" : t.status === "FAILED" ? "destructive" : "secondary"
                          }
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
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
