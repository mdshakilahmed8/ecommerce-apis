const express = require("express");
const router = express.Router();
const { handleServerEvent } = require("../controller/trackingController");

// ==========================================
// 🌐 PUBLIC ROUTE (ফ্রন্টএন্ড থেকে ডেটা রিসিভ করার জন্য)
// ==========================================
router.post("/server-event", handleServerEvent);

module.exports = router;