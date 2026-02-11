const express = require("express");
const router = express.Router();
const { getAllPages, updatePage, createPage, deletePage } = require("../controller/webPageController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.get("/", checkPermission("settings.view"), getAllPages);
router.put("/:id", checkPermission("settings.edit"), updatePage);
router.post("/", checkPermission("settings.create"), createPage);
router.delete("/:id", checkPermission("settings.delete"), deletePage);

module.exports = router;