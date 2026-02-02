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
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// Routes

// Public: সবাই ব্র্যান্ড দেখতে পাবে
router.get("/", getAllBrands);

// Protected: শুধু এডমিন এক্সেস পাবে
router.use(verifyToken, isAdmin);

// লোগো আপলোডের জন্য upload.single ব্যবহার করছি
router.post("/create", upload.single("logo"), createBrand);
router.put("/:id", upload.single("logo"), updateBrand);
router.delete("/:id", deleteBrand);

module.exports = router;