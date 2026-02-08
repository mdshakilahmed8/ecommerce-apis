const { z } = require("zod");

// --- REGISTER SCHEMA (PERFECT) ---
const registerSchema = z.object({
  fullName: z
    .string({ required_error: "Full Name is required" })
    .min(3, "Name must be at least 3 characters")
    .trim(),

  // Email: Empty string হলে null হবে, নাহলে ভ্যালিড ইমেইল হতে হবে
  email: z.preprocess(
    (val) => (val === "" ? null : val), 
    z.string().email("Invalid email address").nullable().optional()
  ),

  countryCode: z
    .string({ required_error: "Country code is required" })
    .regex(/^\d{1,4}$/, "Invalid country code format (e.g., 880)")
    .default("880"),

  phoneNumber: z
    .string({ required_error: "Mobile Number is required" })
    .trim()
    .regex(/^\d+$/, "Phone number must contain only digits")
    .length(10, "Phone number must be exactly 10 digits (e.g., 17XXXXXXXX)")
    .refine((val) => !val.startsWith("0"), {
      message: "Phone number should not start with '0'. Input the rest 10 digits.",
    }),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  confirmPassword: z
    .string({ required_error: "Confirm Password is required" }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], 
});


// --- VERIFY OTP SCHEMA (PERFECT) ---
const verifyOtpSchema = z.object({
  countryCode: z
    .string()
   .regex(/^\d{1,4}$/, "Invalid country code format (e.g., 880)")
    .default("880"),
  
  phoneNumber: z
    .string({ required_error: "Mobile Number is required" })
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),

  otp: z
    .string({ required_error: "OTP is required" })
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});


// --- LOGIN SCHEMA (UPDATED) ---
const loginSchema = z.object({
  // ১. ইমেইল হ্যান্ডলিং (preprocess ব্যবহার করাই বেস্ট প্র্যাকটিস)
  email: z.preprocess(
    (val) => (val === "" ? null : val), 
    z.string().email("Invalid email address").nullable().optional()
  ),
  
  countryCode: z.string().default("880"),
  
  // ২. ফোন নম্বর ভ্যালিডেশন (লগইনেও ফরম্যাট চেক রাখা ভালো)
  phoneNumber: z
    .string()
    .trim()
    .optional(), // এখানে optional থাক, নিচে refine এ চেক হবে

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
})
.refine((data) => {
  // কন্ডিশন: হয় ইমেইল থাকতে হবে, অথবা ফোন নম্বর থাকতে হবে
  if (!data.email && !data.phoneNumber) {
    return false;
  }
  return true;
}, {
  message: "Either Email or Phone Number is required for login.",
  path: ["phoneNumber"], // এরর টি ফোন ইনপুটের নিচে দেখাবে (এটি বেশি ইউজার ফ্রেন্ডলি)
});
  
module.exports = { registerSchema, verifyOtpSchema, loginSchema };