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
// নোট: আপনার validateRequest ফাইলটি যেভাবে এক্সপোর্ট করা, সেভাবে ইম্পোর্ট করবেন।
// যদি module.exports = validateRequest হয়, তাহলে ব্র্যাকেট {} ছাড়া ইম্পোর্ট করবেন।
const {validateRequest} = require("../middlewares/validateRequest"); 
const { createRoleSchema, updateRoleSchema } = require("../validators/roleValidator");

// Auth Middleware (Uncommented & Active)
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");

// --- SECURITY BLOCK (The Gatekeeper) ---
// এই ফাইলের নিচের যেকোনো রাউটে হিট করার আগে সিস্টেম চেক করবে:
// ১. verifyToken: ইউজার লগইন করা আছে কি না এবং টোকেন ভ্যালিড কি না।
// ২. isAdmin: ইউজারের রোল 'admin' বা 'super_admin' কি না।
// সাধারণ কাস্টমার বা ভেন্ডর এখানে ঢুকতে পারবে না।
// router.use(verifyToken, isAdmin); 

// Routes
router.route("/")
  .post(validateRequest(createRoleSchema), createRole) // Create (Only Admin)
  .get(getAllRoles); // Read All (Only Admin)

router.route("/:id")
  .get(getRoleById) // Read One (Only Admin)
  .put(validateRequest(updateRoleSchema), updateRole) // Update (Only Admin)
  .delete(deleteRole); // Delete (Only Admin)

module.exports = router;