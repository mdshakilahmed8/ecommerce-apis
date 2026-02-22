const express = require("express");
const router = express.Router();
const { 
    getShippingSettings, 
    updateShippingSettings 
} = require("../controller/shippingSettingController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");



// ২. রাউটস (Permission Checks Added)
router.get("/", 
    getShippingSettings
);

// ১. অথেন্টিকেশন চেক
router.use(verifyToken);

router.post("/", 
    checkPermission("shipping.edit"), 
    updateShippingSettings
);

module.exports = router;