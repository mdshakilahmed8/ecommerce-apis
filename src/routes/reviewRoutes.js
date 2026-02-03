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

const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

// --- PUBLIC ROUTE ---
router.get("/:productId", getProductReviews); // পাবলিক শুধু Approved রিভিউ দেখবে

// --- USER ROUTE ---
router.use(verifyToken);
// সর্বোচ্চ ৩টি ছবি আপলোড করতে পারবে
router.post("/create", upload.array("images", 3), createReview);
router.delete("/:id", deleteReview);

// --- ADMIN ROUTES ---
router.get("/admin/all", isAdmin, getAllReviewsAdmin); // সব রিভিউ দেখবে
router.put("/admin/status/:id", isAdmin, updateReviewStatus); // স্ট্যাটাস চেঞ্জ করবে

router.put("/admin/reply/:id", isAdmin, adminReplyToReview);

module.exports = router;