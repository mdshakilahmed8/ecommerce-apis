const express = require("express");
const router = express.Router();
const { 
  createReview, 
  getProductReviews, 
  getAllReviewsAdmin,
  updateReviewStatus,
  deleteReview,
  adminReplyToReview
} = require("../controller/reviewController");

// 🔥 isAdmin এর বদলে checkPermission ইম্পোর্ট
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

// ==================================================================
// PUBLIC ROUTE
// ==================================================================
// প্রোডাক্ট পেইজে এপ্রুভড রিভিউ সবাই দেখবে
router.get("/:productId", getProductReviews); 

// ==================================================================
// PROTECTED ROUTES (Logged In Users)
// ==================================================================
// নিচের সব রাউটে লগইন মাস্ট
router.use(verifyToken);

// --- USER ACTIONS (Customer) ---
// সাধারণ কাস্টমার রিভিউ দিবে, তাই এখানে কোনো স্পেশাল পারমিশন লাগবে না
router.post("/create", upload.array("images", 3), createReview);

// ইউজার তার নিজের রিভিউ ডিলিট করবে
// (আপনার কন্ট্রোলারে চেক থাকা উচিত যে ইউজার নিজের রিভিউ ডিলিট করছে কিনা)
router.delete("/:id", deleteReview);

// --- ADMIN ACTIONS (Staff with Permission) ---
// এই কাজগুলো করতে 'review.manage' পারমিশন লাগবে

// ১. সব রিভিউ দেখা (Pending/Approved/Rejected)
router.get(
  "/admin/all", 
  checkPermission("review.view"), 
  getAllReviewsAdmin
);

// ২. স্ট্যাটাস চেঞ্জ করা (Approve/Reject)
router.put(
  "/admin/status/:id", 
  checkPermission("review.edit"), 
  updateReviewStatus
);

// ৩. রিভিউর রিপ্লাই দেওয়া
router.put(
  "/admin/reply/:id", 
  checkPermission("review.reply"), 
  adminReplyToReview
);

module.exports = router;