const express = require("express");
const router = express.Router();
const { 
    initiateOrder, verifyOrderOTP, myOrders, getSingleOrder, 
    getAllOrdersAdmin, updateOrderStatus, assignOrder, addOrderLog, settleCourierPayments
} = require("../controller/orderController");

// 🔥 isAdmin এর বদলে checkPermission ইম্পোর্ট
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

const optionalVerifyToken = (req, res, next) => {
    if (req.headers.authorization) verifyToken(req, res, next);
    else next();
};

// ==================================================================
// 🛒 PUBLIC / CUSTOMER ROUTES
// ==================================================================
router.post("/initiate", optionalVerifyToken, initiateOrder); 
router.post("/verify-create", verifyOrderOTP); 

// ==================================================================
// 🛡️ ADMIN ROUTES (Staff Management)
// ==================================================================

// ১. সব অর্ডার দেখা (View Permission)
router.get(
    "/admin/all", 
    verifyToken, 
    checkPermission("order.view"), // শুধু দেখার পারমিশন
    getAllOrdersAdmin
);

// ২. অর্ডার স্ট্যাটাস আপডেট (Manage Permission)
router.put(
    "/admin/update/:id", 
    verifyToken, 
    checkPermission("order.manage"), // এডিট/ম্যানেজ পারমিশন
    updateOrderStatus
);

// ৩. ডেলিভারি ম্যান বা স্টাফ অ্যাসাইন করা (Manage Permission)
router.put(
    "/admin/assign/:orderId", 
    verifyToken, 
    checkPermission("order.manage"), 
    assignOrder
);

// ৪. ইন্টারনাল লগ বা নোট লেখা (Manage Permission)
router.put(
    "/admin/log/:orderId", 
    verifyToken, 
    checkPermission("order.manage"), 
    addOrderLog
);

// ৫. কুরিয়ার পেমেন্ট সেটেলমেন্ট (Manage Permission)
router.post(
    "/admin/settle-courier", 
    verifyToken, 
    checkPermission("order.manage"), 
    settleCourierPayments
);

// ==================================================================
// 👤 USER ROUTES (My Orders)
// ==================================================================
router.get("/my-orders", verifyToken, myOrders);

// সিঙ্গেল অর্ডার: 
// এটি কাস্টমার নিজের অর্ডার দেখার জন্য ব্যবহার করে, আবার এডমিনও ডিটেইলস দেখার জন্য ব্যবহার করতে পারে।
// কন্ট্রোলারের ভেতরে লজিক থাকা উচিত: যদি এডমিন হয় তবে সব দেখবে, কাস্টমার হলে শুধু নিজেরটা।
router.get("/:id", verifyToken, getSingleOrder); 

module.exports = router;