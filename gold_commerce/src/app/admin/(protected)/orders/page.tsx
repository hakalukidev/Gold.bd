"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Package, Wallet } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";
import type { AdminOrder, OrderMethod } from "@/types";

const METHOD_ICON: Record<OrderMethod, typeof Wallet> = { bkash: Wallet, nagad: Wallet, bank: Landmark, sslcommerz: Package };
const METHOD_LABEL: Record<OrderMethod, string> = { bkash: "bKash", nagad: "Nagad", bank: "Bank transfer", sslcommerz: "SSLCommerz" };
const METHOD_FILTERS = ["ALL", "bkash", "nagad", "bank", "sslcommerz"] as const;

type StatusFilter = "ALL" | "PENDING" | "COMPLETED" | "FAILED";
const STATUS_FILTERS: StatusFilter[] = ["ALL", "PENDING", "COMPLETED", "FAILED"];

function normalizeStatus(status: AdminOrder["status"]): Exclude<StatusFilter, "ALL"> {
  if (status === "APPROVED" || status === "VALID") return "COMPLETED";
  if (status === "PENDING") return "PENDING";
  return "FAILED";
}

function statusBadgeVariant(status: AdminOrder["status"]): "default" | "destructive" | "secondary" {
  const normalized = normalizeStatus(status);
  if (normalized === "COMPLETED") return "default";
  if (normalized === "FAILED") return "destructive";
  return "secondary";
}

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [methodFilter, setMethodFilter] = useState<(typeof METHOD_FILTERS)[number]>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailsOrder, setDetailsOrder] = useState<AdminOrder | null>(null);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => api.get<AdminOrder[]>("/api/admin/orders"),
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const term = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      if (statusFilter !== "ALL" && normalizeStatus(order.status) !== statusFilter) return false;
      if (methodFilter !== "ALL" && order.method !== methodFilter) return false;
      if (from && new Date(order.createdAt) < from) return false;
      if (to && new Date(order.createdAt) > to) return false;
      if (term) {
        const haystack = `${order.orderId} ${order.customerName} ${order.customerPhone ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, methodFilter, dateFrom, dateTo]);

  const filtersActive = search.trim() !== "" || statusFilter !== "ALL" || methodFilter !== "ALL" || dateFrom !== "" || dateTo !== "";

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Every checkout across bKash, Nagad, bank transfer, and SSLCommerz." />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search order ID, customer, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            <span>to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
          </div>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          {orders && (
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredOrders.length} / {orders.length} orders
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
              {s === "ALL" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {METHOD_FILTERS.map((m) => (
            <Button key={m} size="sm" variant={methodFilter === m ? "default" : "outline"} onClick={() => setMethodFilter(m)}>
              {m === "ALL" ? "All methods" : METHOD_LABEL[m]}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState icon={Package} title="Could not load orders" description="Something went wrong fetching orders." />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={Package}
              title={filtersActive ? "No orders match these filters" : "No orders yet"}
              description={filtersActive ? undefined : "Orders will show up as shoppers check out."}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const Icon = METHOD_ICON[order.method];
                    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <TableRow key={`${order.source}-${order.id}`}>
                        <TableCell className="text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 font-medium">
                            <Icon className="size-3.5" />
                            {METHOD_LABEL[order.method]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{order.customerName}</span>{" "}
                          <span className="text-muted-foreground">· {order.customerPhone ?? "—"}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.items.length > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{order.deliveryMethod ?? "—"}</TableCell>
                        <TableCell className="font-medium">{formatBDT(order.amountBDT)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setDetailsOrder(order)}>
                            View
                          </Button>
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

      <Dialog open={Boolean(detailsOrder)} onOpenChange={(open) => !open && setDetailsOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order {detailsOrder?.orderId}</DialogTitle>
          </DialogHeader>
          {detailsOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{detailsOrder.customerName}</p>
                  <p className="text-xs text-muted-foreground">{detailsOrder.customerPhone ?? "—"}</p>
                  {detailsOrder.customerEmail && <p className="text-xs text-muted-foreground">{detailsOrder.customerEmail}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="font-medium">{METHOD_LABEL[detailsOrder.method]}</p>
                  <p className="text-xs text-muted-foreground">{formatBDT(detailsOrder.amountBDT)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Delivery</p>
                <p className="font-medium capitalize">{detailsOrder.deliveryMethod ?? "—"}</p>
                {detailsOrder.deliveryMethod === "home" && (
                  <p className="text-xs text-muted-foreground">
                    {[detailsOrder.address, detailsOrder.district, detailsOrder.division].filter(Boolean).join(", ") || "—"}
                  </p>
                )}
                {detailsOrder.note && <p className="mt-1 text-xs text-muted-foreground">Note: {detailsOrder.note}</p>}
              </div>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Items</p>
                {detailsOrder.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No item snapshot recorded for this order.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailsOrder.items.map((item, i) => (
                      <div key={`${item.id}-${i}`} className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium">{formatBDT(item.unitPriceBDT * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
