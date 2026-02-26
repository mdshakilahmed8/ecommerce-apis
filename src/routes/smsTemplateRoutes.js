const express = require("express");
const router = express.Router();
const { getSmsTemplates, updateSmsTemplates } = require("../controller/smsTemplateController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ==========================================
// 📱 SMS Template Routes (Admin)
// ==========================================
router.use(verifyToken); 


// Get Settings
router.get("/", checkPermission("api.view"), getSmsTemplates);

// Update Settings
router.put("/", checkPermission("api.edit"), updateSmsTemplates); 

module.exports = router;