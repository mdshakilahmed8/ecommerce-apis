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


const { createCoupon, getAllCoupons, updateCoupon, deleteCoupon, applyCoupon } = require("../controller/couponController");

const { createSlide, getAllSlides, updateSlide, deleteSlide } = require("../controller/heroSliderController");



// Public routes
router.get("/sliders", getAllSlides);
// Public Route (Checkout)
router.post("/coupons/apply", applyCoupon);



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



// Admin Routes
router.post("/coupons", verifyToken, checkPermission("marketing.manage"), createCoupon);
router.get("/coupons", verifyToken, checkPermission("marketing.view"), getAllCoupons);
router.put("/coupons/:id", verifyToken, checkPermission("marketing.manage"), updateCoupon);
router.delete("/coupons/:id", verifyToken, checkPermission("marketing.delete"), deleteCoupon);



// Hero Slider Routes
router.post("/sliders", verifyToken, checkPermission("marketing.manage"), createSlide);
 // Publicly accessible (controller handles filtering)
router.put("/sliders/:id", verifyToken, checkPermission("marketing.manage"), updateSlide);
router.delete("/sliders/:id", verifyToken, checkPermission("marketing.delete"), deleteSlide);



module.exports = router;