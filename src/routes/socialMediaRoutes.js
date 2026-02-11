const express = require("express");
const router = express.Router();
const { 
    getSocialMediaSettings, 
    updateSocialMediaSettings 
} = require("../controller/socialMediaController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// Authentication
router.use(verifyToken);

// Routes (Using general settings permission)
router.get("/", checkPermission("settings.view"), getSocialMediaSettings);
router.post("/", checkPermission("settings.edit"), updateSocialMediaSettings);

module.exports = router;