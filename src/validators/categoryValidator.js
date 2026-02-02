const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string({ required_error: "Category name is required" })
    .min(3, "Name must be at least 3 characters")
    .trim(),
  slug: z.string().min(3).optional(),
    
  parentId: z.string().optional().nullable(), // প্যারেন্ট নাও থাকতে পারে (Root Category)
  
  // Icon বা Image আমরা Multer দিয়ে হ্যান্ডেল করব, তাই এখানে স্কিপ করতে পারি 
  // অথবা অপশনাল স্ট্রিং হিসেবে রাখতে পারি
  order: z.coerce.number().optional(),
  isFeatured: z.enum(["true", "false"]).optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(3).optional(),
  slug: z.string().min(3).optional(),
  parentId: z.string().optional().nullable(),
  order: z.coerce.number().optional(),
  isFeatured: z.enum(["true", "false"]).optional()
});

module.exports = { createCategorySchema, updateCategorySchema };