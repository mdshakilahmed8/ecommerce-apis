const express = require("express");
const router = express.Router();
const { 
  getAllBlockedIps, 
  blockIp, 
  unblockIp, 
  checkIpStatus, 
  checkPublicIpStatus 
} = require("../controller/ipController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ==================================================================
// 🌍 PUBLIC ROUTES (No Token Needed)
// ==================================================================
// ফ্রন্টএন্ডে ভিজিটর ঢোকার সাথে সাথে চেক করার জন্য
router.get("/public/check/:ip?", checkPublicIpStatus);


// ==================================================================
// 🛡️ PROTECTED ADMIN ROUTES
// ==================================================================
router.use(verifyToken);

// ১. সব লিস্ট দেখা
router.get(
    "/list", 
    checkPermission("ip.view"), // পারমিশন নাম আপনার DB অনুযায়ী দিন
    getAllBlockedIps
);

// ২. স্ট্যাটাস চেক (ইন্টারনাল)
router.get("/check/:ip", checkIpStatus);

// ৩. ব্লক করা
router.post(
    "/block", 
    checkPermission("ip.block"), 
    blockIp
);

// ৪. আনব্লক করা
router.post(
    "/unblock", 
    checkPermission("ip.unblock"), 
    unblockIp
);

module.exports = router;