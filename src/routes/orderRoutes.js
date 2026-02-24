const express = require("express");
const router = express.Router();
const { 
    initiateOrder, verifyOrderOTP, myOrders, getSingleOrder, 
    getAllOrdersAdmin, updateOrderStatus, assignOrder, addOrderLog, settleCourierPayments,
    updateOrderStatusBulk, updateCRMStatus, 
    updateOrderDetailsFull,
    createPosOrder,
    deleteOrder,
    convertPaymentToCod
} = require("../controller/orderController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");
const { checkSteadfastFraud, pushToSteadfast } = require("../controller/courierController");

// Optional Token Verification for Guest Orders
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
// 🛡️ ADMIN ROUTES
// ==================================================================

// 1. Get All Orders (View Permission)
// ✅ PERMISSIONS.ORDER.VIEW = "order.view"
router.get("/admin/all", verifyToken, checkPermission("order.view"), getAllOrdersAdmin);

// 2. Public Status Update
router.put("/admin/update/:id", verifyToken, checkPermission("order.edit"), updateOrderStatus);

// 3. Full Order Update (Details Edit)
router.put(
    "/admin/update-full/:id", 
    verifyToken, 
    checkPermission("order.edit"), 
    updateOrderDetailsFull
);

// 4. Assign Staff (CRM)
router.patch("/admin/assign/:orderId", verifyToken, checkPermission("order.edit"), assignOrder);

// 5. CRM Internal Status Update
router.patch("/admin/crm-status/:orderId", verifyToken, checkPermission("order.edit"), updateCRMStatus);

// 6. Add Log
router.put("/admin/log/:orderId", verifyToken, checkPermission("order.edit"), addOrderLog);

// 7. Courier Settlement (Financial Edit)
router.post("/admin/settle-courier", verifyToken, checkPermission("order.edit"), settleCourierPayments);

// 8. Bulk Status Update
router.put("/admin/update-status-bulk", verifyToken, checkPermission("order.edit"), updateOrderStatusBulk);

// 9. Steadfast Integration
router.get("/admin/steadfast/fraud-check/:phone", verifyToken, checkPermission("order.edit"), checkSteadfastFraud);
router.post("/admin/steadfast/push", verifyToken, checkPermission("order.edit"), pushToSteadfast);


// ✅ NEW: POS Order Create Route
// এটি শুধু এডমিন এক্সেস করতে পারবে
router.post(
    "/admin/pos/create", 
    verifyToken, 
    checkPermission("order.create"),
    createPosOrder
);

// ==================================================================
// 👤 USER ROUTES
// ==================================================================
router.get("/my-orders", verifyToken, myOrders);
router.get("/:id", verifyToken, getSingleOrder);


// 10. Delete Order (Needs 'order.delete' permission)
router.delete("/admin/delete/:id", verifyToken, checkPermission("order.delete"), deleteOrder);

// 11. Convert to COD (Needs 'order.edit' permission)
router.put("/admin/convert-cod/:id", verifyToken, checkPermission("order.edit"), convertPaymentToCod);

module.exports = router;