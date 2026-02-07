const express = require("express");
const router = express.Router();
const { 
    initiateOrder, verifyOrderOTP, myOrders, getSingleOrder, 
    getAllOrdersAdmin, updateOrderStatus, assignOrder, addOrderLog, settleCourierPayments
} = require("../controller/orderController");

const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

const optionalVerifyToken = (req, res, next) => {
    if (req.headers.authorization) verifyToken(req, res, next);
    else next();
};

// 🛒 Order
router.post("/initiate", optionalVerifyToken, initiateOrder); 
router.post("/verify-create", verifyOrderOTP); 

// 🛡️ Admin (Must be before /:id)
router.get("/admin/all", verifyToken, isAdmin, getAllOrdersAdmin);
router.put("/admin/update/:id", verifyToken, isAdmin, updateOrderStatus);
router.put("/admin/assign/:orderId", verifyToken, isAdmin, assignOrder);
router.put("/admin/log/:orderId", verifyToken, isAdmin, addOrderLog);
router.post("/admin/settle-courier", verifyToken, isAdmin, settleCourierPayments);

// 👤 User
router.get("/my-orders", verifyToken, myOrders);
router.get("/:id", verifyToken, getSingleOrder); 

module.exports = router;