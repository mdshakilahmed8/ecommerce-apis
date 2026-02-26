const express = require("express");
const router = express.Router();
const { getLicense,saveLicense } = require("../controller/storeLicenseController");

// ==========================================
// 🔐 Settings / License Routes
// ==========================================
router.get("/license", getLicense);
router.post("/license", saveLicense);

module.exports = router;