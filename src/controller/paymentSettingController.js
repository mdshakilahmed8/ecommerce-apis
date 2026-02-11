const PaymentSetting = require("../models/PaymentSetting");
const createError = require("http-errors");

// ডিফল্ট পেমেন্ট গেটওয়েগুলো
const DEFAULT_GATEWAYS = [
  { provider: "sslcommerz", isActive: false, isSandbox: true },
  { provider: "bkash", isActive: false, isSandbox: true },
  { provider: "nagad", isActive: false, isSandbox: true },
  { provider: "cod", isActive: true, isSandbox: false } // Cash on Delivery
];

// 1. Get All Settings
exports.getAllPaymentSettings = async (req, res, next) => {
  try {
    let settings = await PaymentSetting.find({});
    
    // ডাটাবেজে বর্তমানে যে গেটওয়েগুলো আছে তার লিস্ট বের করা
    const existingProviders = settings.map(s => s.provider);
    
    // চেক করা যে ডিফল্ট লিস্টের কোনোটি মিসিং আছে কিনা
    const missingGateways = DEFAULT_GATEWAYS.filter(
        g => !existingProviders.includes(g.provider)
    );

    // যদি কোনো গেটওয়ে (যেমন: Nagad বা COD) মিসিং থাকে, তবে শুধু সেটি ইনসার্ট হবে
    if (missingGateways.length > 0) {
        const newSettings = await PaymentSetting.insertMany(missingGateways);
        settings = [...settings, ...newSettings]; // নতুনগুলো বর্তমান লিস্টে যোগ করে দেওয়া হলো
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};

// 2. Create or Update Setting (আগের মতোই থাকবে)
exports.updatePaymentSetting = async (req, res, next) => {
  try {
    const { 
        provider, isActive, storeId, storePassword, 
        username, password, publicKey, privateKey, isSandbox 
    } = req.body;
    
    // Check valid provider
    if(!["sslcommerz", "bkash", "nagad", "cod"].includes(provider)) {
      throw createError(400, "Invalid provider");
    }

    let setting = await PaymentSetting.findOne({ provider });

    if (setting) {
      // Update fields
      if(storeId !== undefined) setting.storeId = storeId;
      if(storePassword !== undefined) setting.storePassword = storePassword;
      if(username !== undefined) setting.username = username;
      if(password !== undefined) setting.password = password;
      if(publicKey !== undefined) setting.publicKey = publicKey;
      if(privateKey !== undefined) setting.privateKey = privateKey;
      if(typeof isActive !== 'undefined') setting.isActive = isActive;
      if(typeof isSandbox !== 'undefined') setting.isSandbox = isSandbox;
      
      await setting.save();
    } else {
      // Create new if somehow deleted
      setting = await PaymentSetting.create(req.body);
    }

    res.status(200).json({ 
        success: true, 
        message: `${provider.toUpperCase()} settings updated successfully`, 
        data: setting 
    });
  } catch (error) { 
      next(error); 
  }
};