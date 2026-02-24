const express = require("express");
const router = express.Router();
const { getAllPages, updatePage, createPage, deletePage, getPageBySlug } = require("../controller/webPageController");
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");


router.get("/", getAllPages);
router.get("/slug/:slug", getPageBySlug); // 🔥 নতুন অ্যাড করা হলো

router.use(verifyToken);

router.put("/:id", checkPermission("settings.edit"), updatePage);
router.post("/", checkPermission("settings.create"), createPage);
router.delete("/:id", checkPermission("settings.delete"), deletePage);

module.exports = router;