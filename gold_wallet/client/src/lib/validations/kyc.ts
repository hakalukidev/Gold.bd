import { z } from "zod";

export const submitKycSchema = z.object({
  nidNumber: z.string().trim().min(10, "Enter a valid NID number").max(20),
  documentUrls: z.array(z.string().url()).min(1, "Upload at least one document"),
});
export type SubmitKycInput = z.infer<typeof submitKycSchema>;

export const reviewKycSchema = z.object({
  kycProfileId: z.string().cuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  rejectReason: z.string().trim().max(500).optional(),
});
export type ReviewKycInput = z.infer<typeof reviewKycSchema>;
