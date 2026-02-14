const BlockedIp = require("../models/BlockedIp");
const createError = require("http-errors");

// ✅ 1. Get All Blocked IPs (Pagination + Search)
exports.getAllBlockedIps = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    // Search Query
    const query = {};
    if (search) {
      query.ip = { $regex: search, $options: "i" };
    }

    const total = await BlockedIp.countDocuments(query);
    const blockedIps = await BlockedIp.find(query)
      .populate("blockedBy", "name email") // এডমিনের নাম দেখানোর জন্য
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: blockedIps,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ✅ 2. Block IP (Manual)
exports.blockIp = async (req, res, next) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) throw createError(400, "IP address is required");

    // Upsert (থাকলে আপডেট, না থাকলে ক্রিয়েট)
    const blocked = await BlockedIp.findOneAndUpdate(
      { ip },
      { ip, reason, blockedBy: req.user._id },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: `IP ${ip} blocked successfully`, data: blocked });
  } catch (error) {
    next(error);
  }
};

// ✅ 3. Unblock IP
exports.unblockIp = async (req, res, next) => {
  try {
    const { ip } = req.body;
    if (!ip) throw createError(400, "IP address is required");

    await BlockedIp.findOneAndDelete({ ip });

    res.status(200).json({ success: true, message: `IP ${ip} unblocked successfully` });
  } catch (error) {
    next(error);
  }
};

// ✅ 4. Check IP Status (Admin/Protected)
exports.checkIpStatus = async (req, res, next) => {
  try {
    const { ip } = req.params;
    const isBlocked = await BlockedIp.exists({ ip });
    res.status(200).json({ success: true, isBlocked: !!isBlocked });
  } catch (error) {
    next(error);
  }
};

// ✅ 5. Public Check (Frontend Pre-check)
exports.checkPublicIpStatus = async (req, res, next) => {
  try {
    // প্যারামস অথবা রিকোয়েস্ট আইপি থেকে নেওয়া হবে
    let ip = req.params.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // IP Clean up
    if (ip && ip.includes("::ffff:")) {
        ip = ip.split("::ffff:")[1];
    }

    const isBlocked = await BlockedIp.exists({ ip });

    res.status(200).json({ 
      success: true, 
      isBlocked: !!isBlocked,
      ip: ip 
    });
  } catch (error) {
    next(error);
  }
};