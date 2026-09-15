"use client";

import { useEffect } from "react";
import type { ComponentType, SVGProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  FileText,
  Hash,
  Mail,
  MapPin,
  PercentCircle,
  Phone,
  ScrollText,
  Users,
  Weight,
} from "lucide-react";
import {
  siteSettingsSchema,
  type SiteSettingsInput,
} from "@/lib/validations/settings";
import {
  aboutStatsSchema,
  type AboutStatsInput,
} from "@/lib/validations/stats";
import {
  useSiteSettings,
  useUpdateSiteSettings,
} from "@/hooks/use-site-settings";
import { useAboutStats, useUpdateAboutStats } from "@/hooks/use-about-stats";
import { ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { IconInput } from "@/components/shared/icon-input";
import { PageHeader } from "@/components/shared/page-header";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/landing/social-icons";

// Same shape as IconInput (src/components/shared/icon-input.tsx) but typed
// for the site's own brand glyphs (social-icons.tsx) instead of `LucideIcon`
// — lucide ships no Facebook/Instagram/LinkedIn/YouTube marks to begin with.
function SocialIconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="relative">
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input className={`pl-8 ${className ?? ""}`} {...props} />
    </div>
  );
}

// The public footer's "Follow us" row, in the same order — each field here
// is one of those icons (see landing-footer.tsx's SOCIAL_LINKS). Blank stays
// blank there: a field left empty here just hides that icon on the site.
const SOCIAL_FIELDS = [
  {
    name: "facebookUrl",
    label: "Facebook",
    icon: FacebookIcon,
    placeholder: "https://facebook.com/yourpage",
  },
  {
    name: "instagramUrl",
    label: "Instagram",
    icon: InstagramIcon,
    placeholder: "https://instagram.com/yourpage",
  },
  {
    name: "linkedinUrl",
    label: "LinkedIn",
    icon: LinkedinIcon,
    placeholder: "https://linkedin.com/company/yourpage",
  },
  {
    name: "youtubeUrl",
    label: "YouTube",
    icon: YoutubeIcon,
    placeholder: "https://youtube.com/@yourchannel",
  },
] as const;

function BusinessDetailsCard() {
  const { data: settings } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      address: "",
      bin: "",
      phone: "",
      email: "",
      tradeLicense: "",
      dbid: "",
      facebookUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
      youtubeUrl: "",
    },
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
      onError: (error) =>
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Failed to update settings",
        ),
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Business details</CardTitle>
        <CardDescription>
          Registered address, registration numbers, and contact details for the
          footer.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <div className="flex-1 space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered address</FormLabel>
                    <FormControl>
                      <IconInput
                        icon={MapPin}
                        placeholder="e.g. House-1, Road-1, Dhaka"
                        {...field}
                      />
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
                      <IconInput
                        icon={Hash}
                        placeholder="Business Identification Number"
                        {...field}
                      />
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
                      <IconInput
                        icon={Phone}
                        placeholder="e.g. 09610XXXXXX"
                        {...field}
                      />
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
                      <IconInput
                        icon={Mail}
                        type="email"
                        placeholder="e.g. info@example.com"
                        {...field}
                      />
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
                      <IconInput
                        icon={ScrollText}
                        placeholder="Trade Licence Number"
                        {...field}
                      />
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
                      <IconInput
                        icon={FileText}
                        placeholder="Digital Business Identification"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              className="mt-4 w-full"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function FollowUsCard() {
  const { data: settings } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();

  const form = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      address: "",
      bin: "",
      phone: "",
      facebookUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
      youtubeUrl: "",
    },
  });

  // Seed the form once the current settings load — a one-shot sync, not a
  // derived value, so it doesn't clobber whatever the admin is mid-typing on
  // a background refetch. Also carries the business-detail fields (address/
  // bin/phone) through untouched even though this card never shows them, so
  // saving here can't blank out what the Business details card set.
  useEffect(() => {
    if (settings) form.reset(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  function onSubmit(values: SiteSettingsInput) {
    updateSettings.mutate(values, {
      onSuccess: () => toast.success("Footer updated"),
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.message : "Failed to update footer",
        ),
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Follow us links</CardTitle>
        <CardDescription>
          Facebook, Instagram, LinkedIn, and YouTube — shown in this order in
          the footer. Leave a field blank to hide that icon there.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <div className="flex-1 space-y-4">
              {SOCIAL_FIELDS.map(({ name, label, icon, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <SocialIconInput
                          icon={icon}
                          type="url"
                          placeholder={placeholder}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Button
              type="submit"
              className="mt-4 w-full"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving…" : "Save footer"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function AboutStatsCard() {
  const { data: stats } = useAboutStats();
  const updateStats = useUpdateAboutStats();

  const form = useForm<AboutStatsInput>({
    resolver: zodResolver(aboutStatsSchema),
    defaultValues: { customers: 0, metalVaultedKg: 0, insuredPercent: 0 },
  });

  // Seed the form once the current stats load — a one-shot sync, not a
  // derived value, so it doesn't clobber whatever the admin is mid-typing on
  // a background refetch. Mirrors the other settings cards' pattern.
  useEffect(() => {
    if (stats) form.reset(stats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  function onSubmit(values: AboutStatsInput) {
    updateStats.mutate(values, {
      onSuccess: () => toast.success("Stats updated"),
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.message : "Failed to update stats",
        ),
    });
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>About section stats</CardTitle>
        <CardDescription>
          Customers, vaulted metal, and insured holdings — shown in this order
          in the public site&apos;s About section. Each starts at 0 until set
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <div className="flex-1 space-y-4">
              <FormField
                control={form.control}
                name="customers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customers</FormLabel>
                    <FormControl>
                      <IconInput
                        icon={Users}
                        type="number"
                        step="1"
                        min="0"
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
                name="metalVaultedKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metal vaulted (kg)</FormLabel>
                    <FormControl>
                      <IconInput
                        icon={Weight}
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
              <FormField
                control={form.control}
                name="insuredPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insured holdings (%)</FormLabel>
                    <FormControl>
                      <IconInput
                        icon={PercentCircle}
                        type="number"
                        step="1"
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
            </div>
            <Button
              type="submit"
              className="mt-4 w-full"
              disabled={updateStats.isPending}
            >
              {updateStats.isPending ? "Saving…" : "Save stats"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Site settings"
        description="Business details, footer links, and About section stats shown on the public site."
      />

      <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        <BusinessDetailsCard />
        <FollowUsCard />
        <AboutStatsCard />
      </div>
    </div>
  );
}
