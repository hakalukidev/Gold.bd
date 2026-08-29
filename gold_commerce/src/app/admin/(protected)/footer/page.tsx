"use client";

import { useEffect } from "react";
import type { ComponentType, SVGProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validations/settings";
import { useSiteSettings, useUpdateSiteSettings } from "@/hooks/use-site-settings";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PageHeader } from "@/components/shared/page-header";
import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/landing/social-icons";

// Same shape as IconInput (src/components/shared/icon-input.tsx) but typed
// for the site's own brand glyphs (social-icons.tsx) instead of `LucideIcon`
// — lucide ships no Facebook/Instagram/LinkedIn/YouTube marks to begin with.
function SocialIconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return (
    <div className="relative">
      <Icon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={`pl-8 ${className ?? ""}`} {...props} />
    </div>
  );
}

// The public footer's "Follow us" row, in the same order — each field here
// is one of those icons (see landing-footer.tsx's SOCIAL_LINKS). Blank stays
// blank there: a field left empty here just hides that icon on the site.
const SOCIAL_FIELDS = [
  { name: "facebookUrl", label: "Facebook", icon: FacebookIcon, placeholder: "https://facebook.com/yourpage" },
  { name: "instagramUrl", label: "Instagram", icon: InstagramIcon, placeholder: "https://instagram.com/yourpage" },
  { name: "linkedinUrl", label: "LinkedIn", icon: LinkedinIcon, placeholder: "https://linkedin.com/company/yourpage" },
  { name: "youtubeUrl", label: "YouTube", icon: YoutubeIcon, placeholder: "https://youtube.com/@yourchannel" },
] as const;

export default function AdminFooterPage() {
  const { data: settings } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: { address: "", bin: "", phone: "", facebookUrl: "", instagramUrl: "", linkedinUrl: "", youtubeUrl: "" },
  });

  // Seed the form once the current settings load — a one-shot sync, not a
  // derived value, so it doesn't clobber whatever the admin is mid-typing on
  // a background refetch. Also carries the business-detail fields (address/
  // bin/phone) through untouched even though this page never shows them, so
  // saving here can't blank out what the Settings page set.
  useEffect(() => {
    if (settings) form.reset(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  function onSubmit(values: SiteSettingsInput) {
    updateSettings.mutate(values, {
      onSuccess: () => toast.success("Footer updated"),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "Failed to update footer"),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Footer" description="The social links shown under “Follow us” in the public site's footer. Leave a field blank to hide that icon there." />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Follow us links</CardTitle>
          <CardDescription>Facebook, Instagram, LinkedIn, and YouTube — shown in this order in the footer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {SOCIAL_FIELDS.map(({ name, label, icon, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <SocialIconInput icon={icon} type="url" placeholder={placeholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving…" : "Save footer"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
