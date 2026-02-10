const express = require("express");
const router = express.Router();
const { 
  createBrand, 
  getAllBrands, 
  updateBrand, 
  deleteBrand 
} = require("../controller/brandController");

// Middlewares
const upload = require("../middlewares/upload");

// 🔥 isAdmin এর বদলে checkPermission ইম্পোর্ট
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ==================================================================
// PUBLIC ROUTES
// ==================================================================
// ব্র্যান্ড লিস্ট সবাই দেখতে পাবে
router.get("/", getAllBrands);

// ==================================================================
// PROTECTED ROUTES (Manage)
// ==================================================================

// ১. লগইন চেক (সবার জন্য)
router.use(verifyToken);

// ২. ক্রিয়েট (Create) - Permission: brand.manage
// ফাইল আপলোডের আগেই পারমিশন চেক করা ভালো (Performance Optimization)
router.post(
  "/create", 
  checkPermission("brand.manage"), 
  upload.single("logo"), 
  createBrand
);

// ৩. আপডেট (Update) - Permission: brand.manage
router.put(
  "/:id", 
  checkPermission("brand.manage"), 
  upload.single("logo"), 
  updateBrand
);

// ৪. ডিলিট (Delete) - Permission: brand.manage
router.delete(
  "/:id", 
  checkPermission("brand.manage"), 
  deleteBrand
);

module.exports = router;