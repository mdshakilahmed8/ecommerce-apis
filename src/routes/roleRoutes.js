const express = require("express");
const router = express.Router();

// Controllers
const { 
  createRole, 
  getAllRoles, 
  getRoleById, 
  updateRole, 
  deleteRole 
} = require("../controller/roleController");

// Validation Middleware
const { validateRequest } = require("../middlewares/validateRequest"); 
const { createRoleSchema, updateRoleSchema } = require("../validators/roleValidator");

// Auth Middleware (Updated)
// 🔥 isAdmin এর বদলে checkPermission ইম্পোর্ট করছি
const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// --- SECURITY BLOCK ---
// ১. লগইন চেক (সবার জন্য বাধ্যতামূলক)
router.use(verifyToken); 

// --- ROUTES ---

router.route("/")
  // ১. রোল তৈরি (Create) - যার 'role.manage' পারমিশন আছে
  .post(
      checkPermission("role.create"), 
      validateRequest(createRoleSchema), 
      createRole
  ) 
  // ২. সব রোল দেখা (Read All) - যার 'role.view' পারমিশন আছে
  .get(
      checkPermission("role.view"), 
      getAllRoles
  ); 

router.route("/:id")
  // ৩. নির্দিষ্ট রোল দেখা (Read One) - যার 'role.view' পারমিশন আছে
  .get(
      checkPermission("role.view"), 
      getRoleById
  ) 
  // ৪. রোল আপডেট (Update) - যার 'role.update' পারমিশন আছে
  .put(
      checkPermission("role.update"), 
      validateRequest(updateRoleSchema), 
      updateRole
  ) 
  // ৫. রোল ডিলিট (Delete) - যার 'role.delete' পারমিশন আছে
  .delete(
      checkPermission("role.delete"), 
      deleteRole
  ); 

module.exports = router;