const express = require("express");
const router = express.Router();
const { getAllPixelSettings, updatePixelSetting, getPublicPixelSettings } = require("../controller/pixelSettingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");


// ফ্রন্টএন্ডের PixelScripts.tsx এই রাউটেই হিট করবে
router.get("/public", getPublicPixelSettings);

router.use(verifyToken);

router.get("/", checkPermission("settings.view"), getAllPixelSettings);
router.post("/", checkPermission("settings.edit"), updatePixelSetting);

module.exports = router;