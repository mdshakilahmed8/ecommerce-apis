const express = require("express");
const router = express.Router();
const { getGeneralSettings, updateGeneralSettings } = require("../controller/generalSettingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.get("/", checkPermission("settings.view"), getGeneralSettings);
router.post("/", checkPermission("settings.edit"), updateGeneralSettings);

module.exports = router;