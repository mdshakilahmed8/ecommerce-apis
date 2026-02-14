const BlockedIp = require("../models/BlockedIp");
const createError = require("../utils/createError"); // আপনার এরর হ্যান্ডলার

const checkBlockedIp = async (req, res, next) => {
  try {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // IP Clean up
    if (ip && ip.includes("::ffff:")) {
        ip = ip.split("::ffff:")[1];
    }

    // চেক করুন ডাটাবেসে এই আইপি আছে কিনা
    const blocked = await BlockedIp.findOne({ ip });

    if (blocked) {
      return next(createError(403, `Access Denied. Your IP (${ip}) has been blocked due to suspicious activity.`));
    }

    next(); // ব্লক না থাকলে পরের ধাপে যাবে
  } catch (error) {
    next(error);
  }
};

module.exports = { checkBlockedIp };