const { z } = require("zod");
const { bdPhone } = require("../auth/auth.validation");

const WEIGHTS_G = [0.5, 1, 2, 5, 10];
const FORMS = ["bar", "coin"];
const METHODS = ["home", "pickup"];

const requestCollectSchema = z
  .object({
    weightGrams: z.coerce
      .number()
      .refine((v) => WEIGHTS_G.includes(v), "Choose one of the offered weights"),
    form: z.enum(FORMS),
    method: z.enum(METHODS),
    fullName: z.string().trim().min(2, "Name is too short").max(100).optional(),
    phone: bdPhone.optional(),
    district: z.string().trim().min(2, "Enter a district").max(100).optional(),
    postalCode: z.string().trim().min(3, "Enter a postal code").max(10).optional(),
    streetAddress: z.string().trim().min(5, "Enter a street address").max(300).optional(),
  })
  .refine((v) => v.method !== "home" || !!v.fullName, { message: "Full name is required", path: ["fullName"] })
  .refine((v) => v.method !== "home" || !!v.phone, { message: "Phone is required", path: ["phone"] })
  .refine((v) => v.method !== "home" || !!v.district, { message: "District is required", path: ["district"] })
  .refine((v) => v.method !== "home" || !!v.postalCode, { message: "Postal code is required", path: ["postalCode"] })
  .refine((v) => v.method !== "home" || !!v.streetAddress, { message: "Street address is required", path: ["streetAddress"] });

module.exports = { requestCollectSchema, WEIGHTS_G, FORMS, METHODS };
