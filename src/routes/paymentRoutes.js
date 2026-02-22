const express = require("express");
const router = express.Router();

// Controllers
const { 
    sslSuccess, 
    bkashCallback, 
    paymentFail 
} = require("../controller/paymentController");

const { 
    updatePaymentSetting, 
    getAllPaymentSettings 
} = require("../controller/paymentSettingController");

// 🔥 isAdmin এর বদলে checkPermission ইম্পোর্ট
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ==================================================================
// 💳 PAYMENT CALLBACKS (Public Routes)
// ==================================================================
// নোট: এই রাউটগুলো পাবলিক থাকতে হবে কারণ পেমেন্ট গেটওয়ে সার্ভার থেকে 
// সরাসরি হিট আসবে যেখানে কোনো অথরাইজেশন হেডার থাকে না।

// 1. SSLCommerz Routes
router.post("/ssl/success/:orderId", sslSuccess); 
router.post("/ssl/ipn", (req, res) => res.status(200).send("IPN Received"));

// 2. bKash Route
router.get("/bkash/callback", bkashCallback); 

// 3. Common Fail/Cancel Route
router.all("/fail/:orderId", paymentFail);
router.all("/cancel/:orderId", paymentFail); 

// ==================================================================
// ⚙️ ADMIN SETTINGS (Protected)
// ==================================================================

// ১. পেমেন্ট গেটওয়ে সেটিংস দেখা (View/Manage Permission)
router.get(
    "/admin/settings", 
    // verifyToken, 
    // checkPermission("api.payment"), // 🔥 Permission Check
    getAllPaymentSettings
);

// ২. পেমেন্ট গেটওয়ে ক্রেডেনশিয়াল আপডেট করা (Manage Permission)
router.post(
    "/admin/settings", 
    verifyToken, 
    checkPermission("api.payment"), // 🔥 Permission Check
    updatePaymentSetting
);

module.exports = router;