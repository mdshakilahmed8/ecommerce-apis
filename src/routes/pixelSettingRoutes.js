const express = require("express");
const router = express.Router();
const { getAllPixelSettings, updatePixelSetting } = require("../controller/pixelSettingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.get("/", checkPermission("settings.view"), getAllPixelSettings);
router.post("/", checkPermission("settings.edit"), updatePixelSetting);

module.exports = router;