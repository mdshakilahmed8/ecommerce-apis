const { z } = require("zod");

const createProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10),
  
  price: z.coerce.number().min(1), // coerce স্ট্রিং কে নাম্বারে কনভার্ট করে
  discountPrice: z.coerce.number().optional(),
  
  category: z.string().min(1, "Category ID is required"),
  brand: z.string().optional(),
  
  stock: z.coerce.number().default(0),
  
  // Tags (String to Array)
  tags: z.string().optional(), // কন্ট্রোলারে স্প্লিট করব

  // Variant Logic
  hasVariants: z.enum(["true", "false"]).transform((val) => val === "true"),
  
  // JSON String কে অবজেক্টে রূপান্তর করে ভ্যালিডেট করা
  variants: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return [];
        }
      }
      return val;
    },
    z.array(
      z.object({
        sku: z.string().optional(),
        price: z.number({ required_error: "Variant price is required" }),
        stock: z.number().default(0),
        attributes: z.record(z.string(), z.string()) // Map validation (Key: String, Value: String)
      })
    ).optional()
  )
});

module.exports = { createProductSchema };