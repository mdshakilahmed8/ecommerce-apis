const router = require("express").Router();
const { getComprehensiveReport, downloadDetailedExcel, getStockReport, downloadStockExcel, getOrderReport, downloadOrderReport } = require("../controller/reportController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// View Dashboard Data
router.get("/comprehensive", verifyToken, checkPermission("report.view"), getComprehensiveReport);
// Download Excel File
router.get("/download-excel", verifyToken, checkPermission("report.view"), downloadDetailedExcel);


router.get("/stock", verifyToken, checkPermission("report.view"), getStockReport);
router.get("/stock/download", verifyToken, checkPermission("report.view"), downloadStockExcel);

// Order Report Route
router.get("/orders", verifyToken, checkPermission("report.view"), getOrderReport);
router.get("/orders/download", verifyToken, checkPermission("report.view"), downloadOrderReport);

module.exports = router;