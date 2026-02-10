const SmsGateway = require("../models/SmsGateway");

// ডিফল্ট গেটওয়ে লিস্ট (যদি ডাটাবেজে না থাকে)
const DEFAULT_GATEWAYS = [
  {
    provider: "bulksmsbd",
    name: "BulkSMS BD",
    baseUrl: "http://bulksmsbd.net/api/smsapi",
    status: "inactive"
  },
  {
    provider: "greenweb",
    name: "GreenWeb Solutions",
    baseUrl: "http://api.greenweb.com.bd/api.php",
    status: "inactive"
  }
];

// 1. Get All Gateways (Initialize if empty)
exports.getAllGateways = async (req, res, next) => {
  try {
    let gateways = await SmsGateway.find();

    // যদি ডাটাবেজ খালি থাকে, তবে ডিফল্ট গেটওয়েগুলো ইনসার্ট করবে
    if (gateways.length === 0) {
      gateways = await SmsGateway.insertMany(DEFAULT_GATEWAYS);
    }

    res.status(200).json({
      success: true,
      data: gateways,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Update Gateway Settings
exports.updateGateway = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { apiKey, senderId, status, baseUrl } = req.body;

    const gateway = await SmsGateway.findById(id);

    if (!gateway) {
      return res.status(404).json({ success: false, message: "Gateway not found" });
    }

    // আপডেট ফিল্ডস
    if (apiKey !== undefined) gateway.apiKey = apiKey;
    if (senderId !== undefined) gateway.senderId = senderId;
    if (baseUrl !== undefined) gateway.baseUrl = baseUrl;
    if (status !== undefined) gateway.status = status;

    // লজিক: যদি এই গেটওয়ে একটিভ করা হয়, বাকিগুলো ইনএকটিভ করতে চাইলে এখানে লজিক বসাতে পারেন।
    // বর্তমানে আমরা মাল্টিপল একটিভ রাখার অপশন রাখছি (ব্যাকএন্ড লজিক ডিসাইড করবে কোনটা ইউজ হবে)।

    await gateway.save();

    res.status(200).json({
      success: true,
      message: `${gateway.name} settings updated successfully`,
      data: gateway,
    });
  } catch (error) {
    next(error);
  }
};