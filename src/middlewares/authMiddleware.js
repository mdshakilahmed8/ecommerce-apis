const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { secretKey } = require("../secret");

/**
 * 1. Verify Access Token
 * কাজ: টোকেন চেক করা, ইউজার ডাটাবেসে আছে কিনা দেখা এবং রোল পপুলেট করা।
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // ১. হেডার থেকে টোকেন নেওয়া
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw createError(401, "Access token is required.");
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>" থেকে শুধু টোকেন
    if (!token) {
      throw createError(401, "Access token is missing.");
    }

    // ২. টোকেন ডিকোড এবং ভেরিফাই করা
    const decoded = jwt.verify(token, secretKey);
    
    // ৩. ডাটাবেস থেকে ফ্রেশ ইউজার ডাটা আনা (সিকিউরিটির জন্য)
    // আমরা রোল পপুলেট করছি যাতে পরের ধাপে রোল চেক করা যায়
    const user = await User.findById(decoded._id).populate("role");

    if (!user) {
      throw createError(401, "User not found or token invalid.");
    }

    // ৪. চেক করা ইউজার অ্যাক্টিভ আছে কিনা (যদি ব্যানড হয়, টোকেন থাকলেও লাভ নেই)
    if (user.status === "banned" || user.status === "suspended") {
      throw createError(403, "Your account has been suspended. Please contact support.");
    }

    // ৫. রিকোয়েস্ট অবজেক্টে ইউজার সেট করা
    req.user = user;
    
    next();

  } catch (error) {
    // JWT এর নিজস্ব এরর হ্যান্ডলিং
    if (error.name === "TokenExpiredError") {
      return next(createError(401, "Token has expired. Please login again."));
    }
    if (error.name === "JsonWebTokenError") {
      return next(createError(401, "Invalid token."));
    }
    next(error);
  }
};

/**
 * 2. Is Admin Middleware
 * কাজ: ইউজার 'System Admin' বা 'Super Admin' কিনা চেক করা।
 */
exports.isAdmin = async (req, res, next) => {
  try {
    // verifyToken মিডলওয়্যারের কারণে req.user.role এ পুরো রোল অবজেক্ট আছে
    const roleSlug = req.user.role.slug; // e.g., "super_admin", "admin", "customer"

    // আমরা চেক করব স্লাগ 'super_admin' বা 'admin' কিনা
    // আপনার Role মডেলে type: "system" এবং "shop" ছিল। এডমিনরা সিস্টেম টাইপের হয়।
    
    const allowedRoles = ["super_admin", "admin"]; // সিস্টেম এডমিনদের স্লাগ

    if (!allowedRoles.includes(roleSlug)) {
      throw createError(403, "Access Denied. Admins only.");
    }

    next();
  } catch (error) {
    next(error);
  }
};


/**
 * 3. Authorize Roles (Dynamic)
 * কাজ: স্পেসিফিক রোল বা একাধিক রোলের পারমিশন চেক করা।
 * ব্যবহার: router.get("/", verifyToken, authorizeRoles("admin", "super_admin"), controller)
 */
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // verifyToken থেকে আমরা req.user পেয়েছি
    if (!req.user || !req.user.role) {
        return next(createError(401, "Authentication failed. Role not found."));
    }

    const userRole = req.user.role.slug; // e.g., "customer", "vendor", "admin"

    // চেক করছি ইউজারের রোলটি allowedRoles লিস্টে আছে কিনা
    if (!allowedRoles.includes(userRole)) {
      return next(
        createError(403, `Access denied. Role '${userRole}' is not authorized to access this resource.`)
      );
    }

    next();
  };
};