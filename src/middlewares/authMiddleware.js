// File: middlewares/authMiddleware.js
const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { secretKey } = require("../secret");

// 1. Verify Token (Web & Mobile Support)
exports.verifyToken = async (req, res, next) => {
  try {
    let token;

    // ১. প্রথমে Header এ খুঁজবে (Mobile App বা ফ্রন্টএন্ড থেকে পাঠালে)
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } 
    // ২. Header এ না পেলে Cookie তে খুঁজবে (Next.js SSR বা Browser এর জন্য)
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) throw createError(401, "Access token is missing.");

    // টোকেন ভেরিফাই
    const decoded = jwt.verify(token, secretKey);
    
    // রোল পপুলেট করা মাস্ট
    const user = await User.findById(decoded._id).populate("role");
    
    if (!user) throw createError(401, "User not found.");
    if (user.status !== "active") {
      throw createError(403, "Your account has been suspended.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") next(createError(401, "Token expired."));
    else if (error.name === "JsonWebTokenError") next(createError(401, "Invalid token."));
    else next(error);
  }
};

// 2. Check Permission (Dynamic & Standard)
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
         throw createError(403, "Role not found.");
      }

      const userRole = req.user.role;
      const userPermissions = userRole.permissions || []; 

      // 🔥 SUPER ADMIN BYPASS
      if (userRole.slug === "super_admin") {
        return next();
      }

      // 🔥 DYNAMIC CHECK
      if (!userPermissions.includes(requiredPermission)) {
        throw createError(403, `Access Denied! You need permission: ${requiredPermission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};