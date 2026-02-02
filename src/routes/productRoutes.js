const express = require("express");
const router = express.Router();
const { 
    createProduct, 
    getAllProducts, 
    getProductBySlug, 
    updateProduct, 
    deleteProduct 
} = require("../controller/productController");

// Middlewares
const upload = require("../middlewares/upload");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// --- PUBLIC ROUTES (কাস্টমারদের জন্য) ---
router.get("/", getAllProducts); // সার্চ, ফিল্টার সব এটাতে
router.get("/:slug", getProductBySlug); // সিঙ্গেল প্রোডাক্ট পেইজ

// --- ADMIN ROUTES ---
router.use(verifyToken, isAdmin);

router.post("/create", upload.array("images", 5), createProduct); // ম্যাক্স ৫টা ছবি
router.put("/:id", upload.array("images", 5), updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
