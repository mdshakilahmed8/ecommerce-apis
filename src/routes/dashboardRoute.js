const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controller/dashboardController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

router.get("/stats", verifyToken, checkPermission("dashboard.view"), getDashboardStats);

module.exports = router;