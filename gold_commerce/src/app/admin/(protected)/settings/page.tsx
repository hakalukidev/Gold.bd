"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileText, Hash, Mail, MapPin, Phone, ScrollText } from "lucide-react";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validations/settings";
import { useSiteSettings, useUpdateSiteSettings } from "@/hooks/use-site-settings";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { IconInput } from "@/components/shared/icon-input";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminSettingsPage() {
  const { data: settings } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: { address: "", bin: "", phone: "", email: "", tradeLicense: "", dbid: "", facebookUrl: "", instagramUrl: "", linkedinUrl: "", youtubeUrl: "" },
  });

  // Seed the form once the current settings load — a one-shot sync, not a
  // derived value, so it doesn't clobber whatever the admin is mid-typing on
  // a background refetch. Mirrors the calculator page's rate-seeding effect.
  useEffect(() => {
    if (settings) form.reset(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  function onSubmit(values: SiteSettingsInput) {
    updateSettings.mutate(values, {
      onSuccess: () => toast.success("Settings updated"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update settings"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Site settings" description="Business details shown in the public site's footer. Leave a field blank to hide it there." />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Registered address, registration numbers, and contact details for the footer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered address</FormLabel>
                    <FormControl>
                      <IconInput icon={MapPin} placeholder="e.g. House-1, Road-1, Dhaka" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BIN</FormLabel>
                    <FormControl>
                      <IconInput icon={Hash} placeholder="Business Identification Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact phone</FormLabel>
                    <FormControl>
                      <IconInput icon={Phone} placeholder="e.g. 09610XXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl>
                      <IconInput icon={Mail} type="email" placeholder="e.g. info@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradeLicense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade licence no.</FormLabel>
                    <FormControl>
                      <IconInput icon={ScrollText} placeholder="Trade Licence Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dbid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DBID no.</FormLabel>
                    <FormControl>
                      <IconInput icon={FileText} placeholder="Digital Business Identification" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving…" : "Save settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
