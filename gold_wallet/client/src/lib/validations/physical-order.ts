import { z } from "zod";

// Mirrors the bdPhone pattern in validations/collect.ts.
const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

/**
 * Delivery details for a Physical Gold order — unlike collect.ts (withdrawing
 * already-vaulted metal, home delivery optional alongside pickup), a physical
 * *purchase* always ships, so every field here is required.
 */
export const physicalOrderAddressSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(100),
  phone: bdPhone,
  district: z.string().trim().min(2, "Enter a district"),
  postalCode: z.string().trim().min(3, "Enter a postal code").max(10),
  streetAddress: z.string().trim().min(5, "Enter a street address"),
});

export type PhysicalOrderAddress = z.infer<typeof physicalOrderAddressSchema>;
