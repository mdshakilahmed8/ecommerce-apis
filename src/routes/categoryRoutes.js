const express = require("express");
const router = express.Router();
const { 
  createCategory, 
  getAllCategories, 
  getCategoryTree, 
  updateCategory, 
  deleteCategory 
} = require("../controller/categoryController");

// Middlewares
const upload = require("../middlewares/upload");
// 🔥 isAdmin এর বদলে checkPermission ইম্পোর্ট করা হলো
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ==================================================================
// PUBLIC ROUTES (Storefront & Admin View)
// ==================================================================
// ক্যাটাগরি ডাটা পাবলিকলি এভেলেবল থাকা স্ট্যান্ডার্ড (কাস্টমারদের জন্য)
router.get("/", getAllCategories); // Flat List
router.get("/tree", getCategoryTree); // Nested List

// ==================================================================
// PROTECTED ROUTES (Management)
// ==================================================================

// ১. নিচের সব রাউটে লগইন বাধ্যতামূলক
router.use(verifyToken);

// ২. ক্রিয়েট (Create) - Permission: category.manage
router.post(
  "/create", 
  checkPermission("category.manage"), // 🔥 Check Permission
  upload.fields([
      { name: 'image', maxCount: 1 }, 
      { name: 'icon', maxCount: 1 }
  ]), 
  createCategory
);

// ৩. আপডেট (Update) - Permission: category.manage
router.put(
  "/:id", 
  checkPermission("category.manage"), // 🔥 Check Permission
  upload.fields([
      { name: 'image', maxCount: 1 }, 
      { name: 'icon', maxCount: 1 }
  ]), 
  updateCategory
);

// ৪. ডিলিট (Delete) - Permission: category.manage
router.delete(
  "/:id", 
  checkPermission("category.manage"), // 🔥 Check Permission
  deleteCategory
);

module.exports = router;