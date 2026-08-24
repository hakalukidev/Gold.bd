import { z } from "zod";

// A single "site settings" resource backs two admin pages — Settings
// (business details) and Footer (social links) — each rendering only its
// own slice of these fields. Both pages load the full resource into their
// form (see their `form.reset(settings)`) so submitting from either one
// carries the other's fields through unchanged instead of blanking them.
export const siteSettingsSchema = z.object({
  address: z.string().trim().max(300).optional().or(z.literal("")),
  bin: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(150).email("Enter a valid email").optional().or(z.literal("")),
  tradeLicense: z.string().trim().max(100).optional().or(z.literal("")),
  dbid: z.string().trim().max(100).optional().or(z.literal("")),
  facebookUrl: z.string().trim().max(300).url("Enter a valid URL").optional().or(z.literal("")),
  instagramUrl: z.string().trim().max(300).url("Enter a valid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().trim().max(300).url("Enter a valid URL").optional().or(z.literal("")),
  youtubeUrl: z.string().trim().max(300).url("Enter a valid URL").optional().or(z.literal("")),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
