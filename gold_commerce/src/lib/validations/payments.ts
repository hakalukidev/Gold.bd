import { z } from "zod";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Enter a valid email").max(255).optional(),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  address: z.string().trim().max(200).optional(),
});

export const initPaymentSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(10_000_000),
  currency: z.string().trim().toUpperCase().default("BDT"),
  customer: customerSchema,
  // Validated against APP_BASE_URL in sslcommerz-service.ts before it's used
  // to build a redirect — never trust it as-is.
  returnBaseUrl: z.string().url(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

export const manualPaymentCustomerSchema = z.object({
  orderId: z.string().trim().min(1).max(64),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(10_000_000),
  currency: z.string().trim().toUpperCase().default("BDT"),
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  phone: bdPhone,
  metadata: z.string().optional(), // JSON-encoded cart/delivery snapshot (multipart form fields are strings)
});

export const bkashNagadPaymentSchema = z.object({
  senderNumber: bdPhone,
  transactionId: z
    .string()
    .trim()
    .min(4, "Enter the transaction ID")
    .max(50),
});

export const bankTransferPaymentSchema = z.object({
  bankAccountNumber: z.string().trim().min(4, "Enter the account number").max(40),
  bankAccountName: z.string().trim().min(2, "Enter the account holder's name").max(100),
  bankName: z.string().trim().min(2, "Enter the bank name").max(100),
  bankBranch: z.string().trim().min(2, "Enter the branch name").max(100),
});

export const declineManualPaymentSchema = z.object({
  reason: z.string().trim().min(3, "Enter a reason").max(300),
});

export const paymentMethodDetailsSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("bkash"), details: z.object({ receiverNumber: bdPhone }) }),
  z.object({ method: z.literal("nagad"), details: z.object({ receiverNumber: bdPhone }) }),
  z.object({
    method: z.literal("bank"),
    details: z.object({
      bankName: z.string().trim().min(2).max(100),
      accountName: z.string().trim().min(2).max(100),
      accountNumber: z.string().trim().min(4).max(40),
      branch: z.string().trim().min(2).max(100),
    }),
  }),
]);
