"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Gem, History, Percent, RadioTower, Sparkles } from "lucide-react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api-client";
import { useMetalRate, type Metal } from "@/hooks/use-metal-rate";
import { MANUAL_KARATS, type ManualKarat } from "@/lib/validations/rates";
import { chargeSettingsSchema } from "@/lib/validations/charges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IconInput } from "@/components/shared/icon-input";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminRateEntry, ChargeSettings } from "@/types";

const KARAT_LABELS: Record<ManualKarat, string> = { "22k": "22K", "21k": "21K", "18k": "18K" };
const KARAT_PURITY: Record<ManualKarat, string> = { "22k": "91.7% pure", "21k": "87.5% pure", "18k": "75.0% pure" };

const METAL_THEME: Record<Metal, { label: string; icon: typeof Coins; text: string; border: string; bg: string }> = {
  gold: { label: "Gold", icon: Coins, text: "text-gold-accent", border: "border-gold/30", bg: "bg-gold/10" },
  silver: { label: "Silver", icon: Gem, text: "text-silver-dark", border: "border-silver/40", bg: "bg-silver/15" },
};

const rateFormSchema = z.object({
  "22k": z.number().positive("Enter a valid price").max(500_000),
  "21k": z.number().positive("Enter a valid price").max(500_000),
  "18k": z.number().positive("Enter a valid price").max(500_000),
});
type RateFormValues = z.infer<typeof rateFormSchema>;

function MetalRatePanel({ metal }: { metal: Metal }) {
  const queryClient = useQueryClient();
  const theme = METAL_THEME[metal];

  const rate22k = useMetalRate(metal, "22k");
  const rate21k = useMetalRate(metal, "21k");
  const rate18k = useMetalRate(metal, "18k");
  const rates = { "22k": rate22k, "21k": rate21k, "18k": rate18k } as const;

  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateFormSchema),
    defaultValues: { "22k": 0, "21k": 0, "18k": 0 },
  });

  // Prefill from the live (bajus or manual) figures once they load — but
  // only while the admin hasn't started typing, so a slow-loading karat
  // doesn't stomp on an edit already in progress.
  useEffect(() => {
    if (form.formState.isDirty) return;
    if (!rate22k.data || !rate21k.data || !rate18k.data) return;
    form.reset({
      "22k": Number(rate22k.data.pricePerGramBDT),
      "21k": Number(rate21k.data.pricePerGramBDT),
      "18k": Number(rate18k.data.pricePerGramBDT),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate22k.data, rate21k.data, rate18k.data]);

  const setRates = useMutation({
    mutationFn: async (values: RateFormValues) => {
      await Promise.all(
        MANUAL_KARATS.map((karat) => api.post("/api/admin/rates", { metal, karat, pricePerGramBDT: values[karat] }))
      );
    },
    onSuccess: (_data, values) => {
      for (const karat of MANUAL_KARATS) {
        queryClient.invalidateQueries({ queryKey: [`${metal}-rate`, karat] });
        queryClient.invalidateQueries({ queryKey: [`${metal}-rate-history`, karat] });
      }
      // The no-karat query defaults to the 22K anchor server-side — same
      // figure, separate client cache entry.
      queryClient.invalidateQueries({ queryKey: [`${metal}-rate`] });
      queryClient.invalidateQueries({ queryKey: [`${metal}-rate-history`] });
      queryClient.invalidateQueries({ queryKey: ["admin-rates-history"] });
      form.reset(values);
      toast.success(`${theme.label} rates updated`);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to set rates"),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {MANUAL_KARATS.map((karat) => {
          const rate = rates[karat];
          return (
            <Card key={karat} className={cn(theme.border)}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{KARAT_LABELS[karat]} · {KARAT_PURITY[karat]}</p>
                  <p className="mt-1 truncate text-xl font-semibold">
                    {rate.data ? `${formatBDT(rate.data.pricePerGramBDT)} / g` : rate.isLoading ? "…" : "—"}
                  </p>
                </div>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", theme.border, theme.bg, theme.text)}>
                  <theme.icon className="size-4" strokeWidth={1.75} />
                </span>
              </CardContent>
              {rate.data?.source && (
                <CardContent className="pt-0">
                  <Badge variant={rate.data.source === "manual" ? "secondary" : "outline"} className="gap-1">
                    {rate.data.source === "manual" ? <Sparkles className="size-3" /> : <RadioTower className="size-3" />}
                    {rate.data.source === "manual" ? "Manually set" : "Synced from BAJUS"}
                  </Badge>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set {theme.label.toLowerCase()} rates</CardTitle>
          <CardDescription>
            Prefilled from bajus.org — edit and save to override. A manual rate takes priority on the site until the
            next day&apos;s BAJUS update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => setRates.mutate(values))}
              className="grid gap-4 sm:grid-cols-3 sm:items-end"
            >
              {MANUAL_KARATS.map((karat) => (
                <FormField
                  key={karat}
                  control={form.control}
                  name={karat}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{KARAT_LABELS[karat]} price / g (BDT)</FormLabel>
                      <FormControl>
                        <IconInput
                          icon={theme.icon}
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
              ))}
              <Button type="submit" className="sm:col-span-3" disabled={setRates.isPending}>
                {setRates.isPending ? "Saving…" : `Update ${theme.label.toLowerCase()} rates`}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function ChargeSettingsPanel() {
  const queryClient = useQueryClient();

  const { data: charges } = useQuery({
    queryKey: ["admin-charge-settings"],
    queryFn: () => api.get<ChargeSettings>("/api/admin/charges"),
  });

  const form = useForm<ChargeSettings>({
    resolver: zodResolver(chargeSettingsSchema),
    defaultValues: { platformChargePercent: 0, vatPercent: 0 },
  });

  // Same prefill-without-stomping-an-edit-in-progress pattern as MetalRatePanel above.
  useEffect(() => {
    if (form.formState.isDirty) return;
    if (!charges) return;
    form.reset(charges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges]);

  const setCharges = useMutation({
    mutationFn: (values: ChargeSettings) => api.post<ChargeSettings>("/api/admin/charges", values),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ["admin-charge-settings"] });
      queryClient.invalidateQueries({ queryKey: ["charge-settings"] });
      form.reset(values);
      toast.success("Charges updated");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update charges"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform &amp; VAT charges</CardTitle>
        <CardDescription>
          Percentages added on top of the real gram rate (and weight premium) to arrive at the price shown to
          shoppers. Applies to both gold and silver, everywhere a product price is computed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => setCharges.mutate(values))}
            className="grid gap-4 sm:grid-cols-2 sm:items-end"
          >
            <FormField
              control={form.control}
              name="platformChargePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform charge (%)</FormLabel>
                  <FormControl>
                    <IconInput
                      icon={Percent}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vatPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT (%)</FormLabel>
                  <FormControl>
                    <IconInput
                      icon={Percent}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="sm:col-span-2" disabled={setCharges.isPending}>
              {setCharges.isPending ? "Saving…" : "Update charges"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AdminRatesPage() {
  const { data: history } = useQuery({
    queryKey: ["admin-rates-history"],
    queryFn: () => api.get<AdminRateEntry[]>("/api/admin/rates"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gold & silver rates"
        description="Live rates sync from bajus.org every few minutes. Set a rate here to override it — takes effect immediately across the site."
      />

      <Tabs defaultValue="gold">
        <TabsList>
          <TabsTrigger value="gold" className="gap-1.5">
            <Coins className="size-4" /> Gold
          </TabsTrigger>
          <TabsTrigger value="silver" className="gap-1.5">
            <Gem className="size-4" /> Silver
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gold">
          <MetalRatePanel metal="gold" />
        </TabsContent>
        <TabsContent value="silver">
          <MetalRatePanel metal="silver" />
        </TabsContent>
      </Tabs>

      <ChargeSettingsPanel />

      <Card>
        <CardHeader>
          <CardTitle>Rate history</CardTitle>
          <CardDescription>Rates you&apos;ve manually set, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <EmptyState icon={History} title="No manual rate history yet" description="Update a rate above to start the history." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metal</TableHead>
                  <TableHead>Karat</TableHead>
                  <TableHead>Price / g</TableHead>
                  <TableHead>Price / bhori</TableHead>
                  <TableHead>Effective at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r, i) => (
                  <TableRow key={`${r.metal}-${r.karat}-${r.effectiveAt}-${i}`}>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {r.metal === "gold" ? <Coins className="size-3" /> : <Gem className="size-3" />}
                        {METAL_THEME[r.metal].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{KARAT_LABELS[r.karat as ManualKarat] ?? r.karat}</TableCell>
                    <TableCell className="font-medium">{formatBDT(r.pricePerGramBDT)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBDT(r.pricePerBhoriBDT)}</TableCell>
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
