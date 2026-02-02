const express = require("express");
const router = express.Router();
const { createProduct } = require("../controller/productController");
const upload = require("../middlewares/upload"); // আপনার Multer কনফিগ
// const { validateRequest } = require("../middlewares/validateRequest"); // Zod Middleware
// const { createProductSchema } = require("../validators/productValidator");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware"); // Admin Check

// Create Product Route
router.post(
  "/create",
  verifyToken, 
  isAdmin,
  upload.array("images", 5),
  // validateRequest(createProductSchema), // FormData এর ক্ষেত্রে Zod middleware একটু ঝামেলা করতে পারে, তাই কন্ট্রোলারে ভ্যালিডেশন বা Zod এর ম্যানুয়াল পার্সিং ভালো।
  createProduct
);

module.exports = router;