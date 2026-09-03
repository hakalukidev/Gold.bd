import { z } from "zod";

// BD mobile numbers: 01XXXXXXXXX (11 digits), optionally with a +88/88 prefix.
const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(100),
    phone: bdPhone,
    email: z.string().trim().email().optional().or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  phone: bdPhone,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  phone: bdPhone,
  code: z.string().length(6, "Enter the 6-digit code"),
  purpose: z.enum(["REGISTER", "LOGIN"]),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
