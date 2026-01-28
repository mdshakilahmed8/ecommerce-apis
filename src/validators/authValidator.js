const { z } = require("zod");

const registerSchema = z.object({
  fullName: z
    .string({ required_error: "Full Name is required" })
    .min(3, "Name must be at least 3 characters")
    .trim(),

  // ইমেইল যদি ফাঁকা স্ট্রিং ("") আসে, সেটা এলাউ করব, অথবা ভ্যালিড ইমেইল হতে হবে
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")), 

  countryCode: z.string().default("+880"),

  phoneNumber: z
    .string({ required_error: "Mobile Number is required" })
    // আপনার UI তে +880 আলাদা আছে, তাই বাকি ১০ ডিজিট ইনপুট নিবে (e.g. 1712345678)
    .length(10, "Phone number must be exactly 10 digits (without leading 0)")
    .regex(/^\d+$/, "Phone number must contain only numbers"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  confirmPassword: z
    .string({ required_error: "Confirm Password is required" }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], // এই এরর ফ্রন্টএন্ডে confirmPassword ফিল্ডের নিচে দেখাবে
});


const verifyOtpSchema = z.object({
  countryCode: z.string().default("+880"),
  
  phoneNumber: z
    .string({ required_error: "Mobile Number is required" })
    .length(10, "Phone number must be exactly 10 digits"),

  otp: z
    .string({ required_error: "OTP is required" })
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

module.exports = { registerSchema, verifyOtpSchema };