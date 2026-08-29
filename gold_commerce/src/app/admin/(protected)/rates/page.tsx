"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, History } from "lucide-react";
import { setGoldRateSchema, type SetGoldRateInput } from "@/lib/validations/gold";
import { api, ApiError } from "@/lib/api-client";
import { useGoldRate } from "@/hooks/use-gold-rate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconInput } from "@/components/shared/icon-input";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";

interface GoldRateRow {
  id: string;
  pricePerGramBDT: string;
  effectiveAt: string;
}

export default function AdminRatesPage() {
  const queryClient = useQueryClient();
  const { data: rates } = useQuery({
    queryKey: ["admin-rates"],
    queryFn: () => api.get<GoldRateRow[]>("/api/admin/rates"),
  });

  const setRate = useMutation({
    mutationFn: (values: SetGoldRateInput) => api.post("/api/admin/rates", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rates"] });
      queryClient.invalidateQueries({ queryKey: ["gold-rate"] });
      toast.success("Rate updated");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to set rate"),
  });

  const form = useForm<SetGoldRateInput>({
    resolver: zodResolver(setGoldRateSchema),
    defaultValues: { pricePerGramBDT: 0 },
  });

  const { data: currentRate } = useGoldRate();

  return (
    <div className="space-y-6">
      <PageHeader title="Gold rate" description="Set the live per-gram rate used for buy/sell orders." />

      {currentRate && (
        <StatCard icon={Coins} label="Current rate" value={`${formatBDT(currentRate.pricePerGramBDT)} / g`} className="sm:max-w-xs" />
      )}

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Set gold rate</CardTitle>
          <CardDescription>Takes effect immediately for new buy/sell orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => {
                setRate.mutate(values);
                form.reset({ pricePerGramBDT: 0 });
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="pricePerGramBDT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per gram (BDT)</FormLabel>
                    <FormControl>
                      <IconInput
                        icon={Coins}
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={setRate.isPending}>
                {setRate.isPending ? "Saving…" : "Update rate"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate history</CardTitle>
        </CardHeader>
        <CardContent>
          {!rates || rates.length === 0 ? (
            <EmptyState icon={History} title="No rate history yet" description="Set a rate above to start the history." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Price / g</TableHead>
                  <TableHead>Effective at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{formatBDT(r.pricePerGramBDT)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(r.effectiveAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
