const express = require("express");
const router = express.Router();
const { 
  createAdmin, 
  getAllAdmins, 
  getAdminById, 
  updateAdmin, 
  deleteAdmin, 
  blockIp,
  unblockIp,
  checkIpStatus,
  checkPublicIpStatus,
  getAllBlockedIps
} = require("../controller/adminController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ১. অথেন্টিকেশন
router.use(verifyToken);

// ২. রাউটস (Strict Permission Mapping)

router.route("/")
  .get(
      checkPermission("admin.view"), // শুধু দেখার পারমিশন
      getAllAdmins
  )
  .post(
      checkPermission("admin.create"), // তৈরি করার পারমিশন
      createAdmin
  );

router.route("/:id")
  .get(
      checkPermission("admin.view"), // ডিটেইলস দেখার পারমিশন
      getAdminById
  )
  .put(
      checkPermission("admin.update"), // আপডেট করার পারমিশন
      updateAdmin
  )
  .delete(
      checkPermission("admin.delete"), // ডিলিট করার পারমিশন
      deleteAdmin
  );
  

module.exports = router;