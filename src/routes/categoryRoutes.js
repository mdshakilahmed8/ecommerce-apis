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
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// Public Routes (সবাই ক্যাটাগরি দেখতে পাবে)
router.get("/", getAllCategories); // ফ্ল্যাট লিস্ট (এডমিনের জন্য ভালো)
router.get("/tree", getCategoryTree); // নেস্টেড লিস্ট (মেনুবারের জন্য ভালো)

// Protected Routes (Create/Edit/Delete only Admin)
router.use(verifyToken, isAdmin);

router.post(
    "/create", 
    upload.fields([
        { name: 'image', maxCount: 1 }, 
        { name: 'icon', maxCount: 1 }
    ]), 
    createCategory
);

router.put(
    "/:id", 
    upload.fields([
        { name: 'image', maxCount: 1 }, 
        { name: 'icon', maxCount: 1 }
    ]), 
    updateCategory
);

router.delete("/:id", deleteCategory);

module.exports = router;