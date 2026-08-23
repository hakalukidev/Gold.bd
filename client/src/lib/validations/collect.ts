import { z } from "zod";

// Mirrors the bdPhone pattern in validations/checkout.ts.
const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

export const COLLECT_WEIGHTS_G = [0.5, 1, 2, 5, 10] as const;
export const COLLECT_FORMS = ["bar", "coin"] as const;
export const COLLECT_METHODS = ["home", "pickup"] as const;

export type CollectForm = (typeof COLLECT_FORMS)[number];
export type CollectMethod = (typeof COLLECT_METHODS)[number];

export const collectSchema = z
  .object({
    weightGrams: z.number().positive(),
    form: z.enum(COLLECT_FORMS),
    method: z.enum(COLLECT_METHODS),
    fullName: z.string().trim().min(2, "Name is too short").max(100),
    phone: bdPhone,
    district: z.string().trim().min(2, "Enter a district").optional().or(z.literal("")),
    postalCode: z.string().trim().min(3, "Enter a postal code").max(10).optional().or(z.literal("")),
    streetAddress: z.string().trim().min(5, "Enter a street address").optional().or(z.literal("")),
  })
  // Only home delivery needs an address — pickup collects in person.
  .superRefine((data, ctx) => {
    if (data.method !== "home") return;
    if (!data.district) ctx.addIssue({ code: "custom", message: "Enter a district", path: ["district"] });
    if (!data.postalCode) ctx.addIssue({ code: "custom", message: "Enter a postal code", path: ["postalCode"] });
    if (!data.streetAddress) ctx.addIssue({ code: "custom", message: "Enter a street address", path: ["streetAddress"] });
  });

export type CollectInput = z.infer<typeof collectSchema>;
