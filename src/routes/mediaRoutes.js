const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadEditorImage, uploadImage } = require("../controller/mediaController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Use Memory Storage for Multer
const upload = multer({ storage: multer.memoryStorage() });

// 📌 Route: /api/admin/media/editor-upload
// SunEditor file name 'file-0' পাঠায়
router.post("/editor-upload", verifyToken, upload.single("file-0"), uploadEditorImage);
router.post("/upload", verifyToken, upload.single("image"), uploadImage);

module.exports = router;