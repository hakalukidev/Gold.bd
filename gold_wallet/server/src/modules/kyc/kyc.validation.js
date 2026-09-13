const { z } = require("zod");

// BD NID numbers come in three generations: 10-digit (new smart card era),
// 13-digit (old, embeds birth year) or 17-digit (13-digit prefixed with the
// full birth year). Free text otherwise — this app doesn't verify against
// the actual Election Commission database, just shape-checks the input a
// human reviewer will read alongside the uploaded card photos.
const submitKycSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dob must be YYYY-MM-DD")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  nidNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, "Enter a valid 10, 13 or 17-digit NID number"),
});

const reviewKycSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision !== "REJECTED" || !!v.rejectReason, {
    message: "rejectReason is required when rejecting a submission",
    path: ["rejectReason"],
  });

module.exports = { submitKycSchema, reviewKycSchema };
