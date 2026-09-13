import { z } from "zod";

// Mirrors wallet_server's kyc.validation.js — this only gates the "can I
// submit" state client-side (the real check is server-side); the actual
// request goes over FormData, not JSON, since it carries three image files.
export const submitKycSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  dob: z.string().trim().optional(),
  nidNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, "Enter a valid 10, 13 or 17-digit NID number"),
  nidFront: z.instanceof(File, { message: "Upload the front of your NID" }),
  nidBack: z.instanceof(File, { message: "Upload the back of your NID" }),
  selfie: z.instanceof(File, { message: "Upload a selfie" }),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

export const reviewKycSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision !== "REJECTED" || !!v.rejectReason, {
    message: "A reason is required when rejecting a submission",
    path: ["rejectReason"],
  });
export type ReviewKycInput = z.infer<typeof reviewKycSchema>;
