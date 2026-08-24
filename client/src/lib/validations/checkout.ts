import { z } from "zod";

// BD mobile numbers: 01XXXXXXXXX (11 digits), optionally with a +88/88 prefix.
// Mirrors the pattern in validations/auth.ts.
const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

export const DELIVERY_METHODS = ["home", "pickup"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const PAYMENT_METHODS = ["bkash", "nagad", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const checkoutSchema = z
  .object({
    deliveryMethod: z.enum(DELIVERY_METHODS),
    paymentMethod: z.enum(PAYMENT_METHODS),
    recipientName: z.string().trim().min(2, "Name is too short").max(100),
    recipientEmail: z.string().trim().email("Enter a valid email"),
    recipientPhone: bdPhone,
    address: z.string().trim().max(200).optional().or(z.literal("")),
    division: z.string().trim().optional().or(z.literal("")),
    district: z.string().trim().optional().or(z.literal("")),
    note: z.string().trim().max(500).optional().or(z.literal("")),
  })
  // Division/district only matter for delivery — pickup collects from a
  // point the shopper visits in person, so don't force an address on them.
  .superRefine((data, ctx) => {
    if (data.deliveryMethod !== "home") return;
    if (!data.address) ctx.addIssue({ code: "custom", message: "Enter an address", path: ["address"] });
    if (!data.division) ctx.addIssue({ code: "custom", message: "Select a division", path: ["division"] });
    if (!data.district) ctx.addIssue({ code: "custom", message: "Select a district", path: ["district"] });
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
