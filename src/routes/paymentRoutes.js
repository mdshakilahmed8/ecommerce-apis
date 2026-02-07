const express = require("express");
const router = express.Router();
const { 
    sslSuccess, 
    bkashCallback, 
    paymentFail 
} = require("../controller/paymentController");

const { 
    updatePaymentSetting, 
    getAllPaymentSettings 
} = require("../controller/paymentSettingController");

const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// ==========================================
// 💳 PAYMENT CALLBACKS (Public Routes)
// ==========================================

// 1. SSLCommerz Routes
router.post("/ssl/success/:orderId", sslSuccess); // SSLCommerz POST request পাঠায়
router.post("/ssl/ipn", (req, res) => res.status(200).send("IPN Received")); // ✅ Missing IPN Route Fixed

// 2. bKash Route
router.get("/bkash/callback", bkashCallback); // bKash GET request পাঠায়

// 3. Common Fail/Cancel Route
// router.all ব্যবহার করছি কারণ fail/cancel কখনো GET আবার কখনো POST হতে পারে
router.all("/fail/:orderId", paymentFail);
router.all("/cancel/:orderId", paymentFail); // যদি cancel URL আলাদা দেন

// ==========================================
// ⚙️ ADMIN SETTINGS (Protected)
// ==========================================
router.get("/admin/settings", verifyToken, isAdmin, getAllPaymentSettings);
router.post("/admin/settings", verifyToken, isAdmin, updatePaymentSetting);

module.exports = router;