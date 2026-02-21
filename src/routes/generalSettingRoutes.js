const express = require("express");
const router = express.Router();
const { getGeneralSettings, updateGeneralSettings } = require("../controller/generalSettingController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");


router.get("/", getGeneralSettings);

router.use(verifyToken);
router.post("/", checkPermission("settings.edit"), updateGeneralSettings);

module.exports = router;