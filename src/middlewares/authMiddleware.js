const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { secretKey } = require("../secret");

// 1. Verify Token (Login Check)
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw createError(401, "Access token is required.");

    const token = authHeader.split(" ")[1];
    if (!token) throw createError(401, "Access token is missing.");

    const decoded = jwt.verify(token, secretKey);
    
    // রোল এবং পারমিশন পপুলেট করা মাস্ট
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

      // 🔥 SUPER ADMIN BYPASS (God Mode)
      // সুপার এডমিনের কোনো পারমিশন চেক লাগবে না, সে সব পারবে।
      if (userRole.slug === "super_admin") {
        return next();
      }

      // 🔥 DYNAMIC CHECK
      // ফ্রন্টএন্ড থেকে যে স্ট্রিং (e.g. 'admin.manage') আসছে, সেটা ডাটাবেসে আছে কিনা চেক
      if (!userPermissions.includes(requiredPermission)) {
        throw createError(403, `Access Denied! You need permission: ${requiredPermission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};