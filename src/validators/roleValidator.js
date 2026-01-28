const { z } = require("zod");

const createRoleSchema = z.object({
  name: z
    .string({ required_error: "Role name is required" })
    .min(3, "Role name must be at least 3 characters")
    .trim(),

  permissions: z
    .array(z.string(), { required_error: "Permissions are required" })
    .nonempty("At least one permission is required"),
    
  description: z.string().optional(),
});

const updateRoleSchema = z.object({
  name: z
    .string()
    .min(3, "Role name must be at least 3 characters")
    .trim()
    .optional(),

  permissions: z
    .array(z.string())
    .nonempty("Permissions cannot be empty")
    .optional(),
    
  description: z.string().optional(),
});

module.exports = { createRoleSchema, updateRoleSchema };