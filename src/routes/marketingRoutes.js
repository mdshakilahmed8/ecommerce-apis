const express = require("express");
const router = express.Router();
const { sendBulkSms, getSmsLogs, exportSmsLogs } = require("../controller/marketingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.post("/send-sms", checkPermission("sms.send"), sendBulkSms);

router.get("/logs", checkPermission("sms.view"), getSmsLogs);

// 🔥 Export Route
router.get("/logs/export", checkPermission("sms.view"), exportSmsLogs);

module.exports = router;