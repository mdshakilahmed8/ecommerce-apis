const express = require("express");
const router = express.Router();
const { syncAbandonedCheckout, getAllAbandonedAdmin, updateAbandonedCRM } = require("../controller/abandonedController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

const optionalVerifyToken = (req, res, next) => {
    if (req.headers.authorization) verifyToken(req, res, next);
    else next();
};

router.post("/sync", optionalVerifyToken, syncAbandonedCheckout);


// 🛡️ অ্যাডমিন সাইড
router.get("/admin/all", verifyToken, checkPermission("order.incomplete_manage"), getAllAbandonedAdmin);
router.patch("/admin/update/:id", verifyToken, checkPermission("order.incomplete_manage"), updateAbandonedCRM);

module.exports = router;