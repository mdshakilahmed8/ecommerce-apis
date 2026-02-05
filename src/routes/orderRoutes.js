const express = require("express");
const router = express.Router();
const { 
    initiateOrder,       
    verifyOrderOTP,     
    myOrders, 
    getSingleOrder,      
    getAllOrdersAdmin, 
    updateOrderStatus,
    assignOrder, 
    addOrderLog, 
    settleCourierPayments
} = require("../controller/orderController");

const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// Custom Middleware: Optional Auth (for initiate order)
const optionalVerifyToken = (req, res, next) => {
    if (req.headers.authorization) verifyToken(req, res, next);
    else next();
};

// ==========================================
// 🛒 ORDER PLACEMENT FLOW (2 Steps)
// ==========================================

// Step 1: অর্ডার শুরু করা (লগইন ইউজার হলে ডিরেক্ট অর্ডার, নতুন হলে OTP যাবে)
router.post("/initiate", optionalVerifyToken, initiateOrder); 

// Step 2: OTP ভেরিফাই করে অর্ডার কনফার্ম করা (শুধু নতুন ইউজারদের জন্য)
router.post("/verify-create", verifyOrderOTP); 


// ==========================================
// 👤 USER ROUTES
// ==========================================
router.get("/my-orders", verifyToken, myOrders);
router.get("/:id", verifyToken, getSingleOrder); // নিজের অর্ডার ডিটেইলস দেখা


// ==========================================
// 🛡️ ADMIN ROUTES
// ==========================================
router.get("/admin/all", verifyToken, isAdmin, getAllOrdersAdmin);
router.put("/admin/update/:id", verifyToken, isAdmin, updateOrderStatus);

// CRM Features
router.put("/admin/assign/:orderId", verifyToken, isAdmin, assignOrder);
router.put("/admin/log/:orderId", verifyToken, isAdmin, addOrderLog);

// Finance
router.post("/admin/settle-courier", verifyToken, isAdmin, settleCourierPayments);

module.exports = router;