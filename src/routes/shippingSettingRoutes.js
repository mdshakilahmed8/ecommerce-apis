const express = require("express");
const router = express.Router();
const { 
    getShippingSettings, 
    updateShippingSettings 
} = require("../controller/shippingSettingController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ১. অথেন্টিকেশন চেক
router.use(verifyToken);

// ২. রাউটস (Permission Checks Added)
router.get("/", 
    checkPermission("shipping.view"), 
    getShippingSettings
);

router.post("/", 
    checkPermission("shipping.edit"), 
    updateShippingSettings
);

module.exports = router;