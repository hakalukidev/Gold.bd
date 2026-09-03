import { z } from "zod";

export const depositSchema = z.object({
  amountBDT: z.number().positive("Enter an amount to deposit").max(1_000_000),
});
export type DepositInput = z.infer<typeof depositSchema>;

export const withdrawSchema = z.object({
  amountBDT: z.number().positive("Enter an amount to withdraw").max(1_000_000),
});
export type WithdrawInput = z.infer<typeof withdrawSchema>;
