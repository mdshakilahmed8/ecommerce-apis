const express = require("express");
const router = express.Router();
const { 
  createProduct, 
  getAllProducts, 
  getProductBySlug, 
  updateProduct, 
  deleteProduct,
  getRelatedProducts,
  searchAndFilterProducts,
  getFeaturedCategoryProducts
} = require("../controller/productController");

// Middlewares
const upload = require("../middlewares/upload");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ==================================================================
// PUBLIC ROUTES (Storefront)
// ==================================================================
// প্রোডাক্ট দেখা সবার জন্য উন্মুক্ত
router.get("/search", searchAndFilterProducts);
router.get("/featured/category-products", getFeaturedCategoryProducts); 
router.get("/", getAllProducts); 
router.get("/related/:id", getRelatedProducts); 
router.get("/:slug", getProductBySlug);

// ==================================================================
// PROTECTED ROUTES (Management)
// ==================================================================

// ১. লগইন চেক (সবার জন্য)
router.use(verifyToken);

// ২. ক্রিয়েট (Create) - Permission: product.create
router.post(
  "/create", 
  checkPermission("product.create"), 
  upload.array("images", 5), 
  createProduct
);

// ৩. আপডেট (Edit) - Permission: product.edit
router.put(
  "/:id", 
  checkPermission("product.edit"), 
  upload.array("images", 5), 
  updateProduct
);

// ৪. ডিলিট (Delete) - Permission: product.delete
router.delete(
  "/:id", 
  checkPermission("product.delete"), 
  deleteProduct
);

module.exports = router;