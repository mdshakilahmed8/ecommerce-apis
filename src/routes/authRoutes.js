const express = require("express");
const router = express.Router();

// Controllers
const { 
    registerUser, 
    verifyOtp, 
    loginUser, 
    logoutUser, 
    resendOtp,
    refreshToken
} = require("../controller/authController");

// Middlewares & Validators
const { validateRequest } = require("../middlewares/validateRequest");
const { registerSchema, verifyOtpSchema, loginSchema } = require("../validators/authValidator");

// --- ROUTES ---

// 1. Registration & Verification
router.post("/register", validateRequest(registerSchema), registerUser);
router.post("/verify-otp", validateRequest(verifyOtpSchema), verifyOtp);

// 2. Login & Logout (Essential)
// Login এর জন্য আলাদা ভ্যালিডেশন স্কিমা বানানো ভালো, আপাতত registerSchema বা নতুন স্কিমা দিতে পারেন
router.post("/login", validateRequest(loginSchema), loginUser);
router.post("/logout", logoutUser);

// 3. Utilities
router.post("/resend-otp", resendOtp); // যদি OTP না আসে
router.post("/refresh-token", refreshToken); // এক্সেস টোকেন শেষ হলে নতুন টোকেন পাওয়ার জন্য

module.exports = router;