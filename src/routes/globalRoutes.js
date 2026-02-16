const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const { globalSearch, getNotifications, markNotificationRead } = require("../controller/globalController");

router.get("/search", verifyToken, globalSearch);
router.get("/notifications", verifyToken, getNotifications);
router.put("/notifications/:id/read", verifyToken, markNotificationRead);

module.exports = router;