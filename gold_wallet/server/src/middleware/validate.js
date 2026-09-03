/** Validates req.body against a zod schema, replacing it with the parsed (and transformed) value. */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return res.status(400).json({ success: false, error: "Invalid input", fieldErrors });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
