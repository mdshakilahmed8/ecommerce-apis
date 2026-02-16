const express = require("express");
const router = express.Router();
const { sendBulkSms, getSmsLogs, exportSmsLogs } = require("../controller/marketingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

const { 
    saveLandingPage, 
    getAllLandingPages, 
    getLandingPagePublic, 
    getLandingPageAdmin,
    deleteLandingPage 
} = require("../controller/landingPageController");

router.use(verifyToken);

router.post("/send-sms", checkPermission("sms.send"), sendBulkSms);

router.get("/logs", checkPermission("sms.view"), getSmsLogs);

// 🔥 Export Route
router.get("/logs/export", checkPermission("sms.view"), exportSmsLogs);


// ===========================================
// 🌍 PUBLIC ROUTES (Frontend Users)
// ===========================================
router.get("/landing/public/:slug", getLandingPagePublic); 


// ===========================================
// 🛡️ ADMIN ROUTES (Secured)
// ===========================================

// 1. Get All List
router.get(
    "/landing/all", 
    verifyToken, 
    checkPermission("landing_page.view"), 
    getAllLandingPages
);

// 2. Get Single for Edit (By Slug)
router.get(
    "/landing/:slug", 
    verifyToken, 
    checkPermission("landing_page.view"), 
    getLandingPageAdmin
);

// 3. Create or Update (Save)
router.post(
    "/landing/save", 
    verifyToken, 
    checkPermission("landing_page.create"), 
    saveLandingPage
);

// 4. Delete
router.delete(
    "/landing/:id", 
    verifyToken, 
    checkPermission("landing_page.delete"), 
    deleteLandingPage
);



module.exports = router;