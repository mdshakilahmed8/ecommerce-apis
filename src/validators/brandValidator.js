const { z } = require("zod");

const createBrandSchema = z.object({
  name: z.string({ required_error: "Brand name is required" })
    .min(2, "Name must be at least 2 characters")
    .trim(),
  
  slug: z.string().optional(), // ইউজার চাইলে স্ল্যাগ দিতে পারে
  
  website: z.string().optional(), // URL ভ্যালিডেশন অপশনাল রাখলাম
  status: z.enum(["active", "inactive"]).optional(),
  isFeatured: z.enum(["true", "false"]).optional()
});

module.exports = { createBrandSchema };