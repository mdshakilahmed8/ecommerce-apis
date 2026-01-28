// src/validators/userValidator.js
const { z } = require("zod");

// ১. স্কিমা ডিফাইন করা
const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" }) // কাস্টম মেসেজ
    .min(3, { message: "Name must be at least 3 characters" })
    .trim(),

  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email address" }),

  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),

  // বয়স অপশনাল, দিলে অবশ্যই নাম্বার হতে হবে
  age: z.number().optional(),
});

module.exports = { registerSchema };
