const express = require("express");
const router = express.Router();
const { getAllCourierSettings, updateCourierSetting } = require("../controller/courierSettingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

router.use(verifyToken);

// Get Settings
router.get("/", checkPermission("api.edit"), getAllCourierSettings);

// Update Settings
router.post("/", checkPermission("api.edit"), updateCourierSetting);

module.exports = router;