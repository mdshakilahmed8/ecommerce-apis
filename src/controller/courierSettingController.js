const CourierSetting = require("../models/CourierSetting");
const createError = require("http-errors");

// ডিফল্ট কুরিয়ারগুলো
const DEFAULT_COURIERS = [
  { 
      provider: "pathao", 
      name: "Pathao Courier", 
      baseUrl: "https://api-hermes.pathao.com",
      isActive: false, 
      isSandbox: false 
  },
  { 
      provider: "steadfast", 
      name: "Steadfast Courier", 
      baseUrl: "https://portal.steadfast.com.bd/api/v1",
      isActive: false, 
      isSandbox: false 
  }
];

// 1. Get All Courier Settings
exports.getAllCourierSettings = async (req, res, next) => {
  try {
    let settings = await CourierSetting.find({});
    
    // ডাটাবেজে বর্তমানে যে কুরিয়ারগুলো আছে তার লিস্ট বের করা
    const existingProviders = settings.map(s => s.provider);
    
    // চেক করা যে ডিফল্ট লিস্টের কোনোটি মিসিং আছে কিনা
    const missingCouriers = DEFAULT_COURIERS.filter(
        c => !existingProviders.includes(c.provider)
    );

    // মিসিং থাকলে ডাটাবেজে ইনসার্ট করা
    if (missingCouriers.length > 0) {
        const newSettings = await CourierSetting.insertMany(missingCouriers);
        settings = [...settings, ...newSettings];
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};

// 2. Update Courier Setting
exports.updateCourierSetting = async (req, res, next) => {
  try {
    const { 
        provider, isActive, apiKey, secretKey, 
        username, password, storeId, baseUrl, isSandbox 
    } = req.body;
    
    if(!["pathao", "steadfast"].includes(provider)) {
      throw createError(400, "Invalid courier provider");
    }

    let setting = await CourierSetting.findOne({ provider });

    if (setting) {
      if(apiKey !== undefined) setting.apiKey = apiKey;
      if(secretKey !== undefined) setting.secretKey = secretKey;
      if(username !== undefined) setting.username = username;
      if(password !== undefined) setting.password = password;
      if(storeId !== undefined) setting.storeId = storeId;
      if(baseUrl !== undefined) setting.baseUrl = baseUrl;
      if(typeof isActive !== 'undefined') setting.isActive = isActive;
      if(typeof isSandbox !== 'undefined') setting.isSandbox = isSandbox;
      
      await setting.save();
    } else {
      setting = await CourierSetting.create(req.body);
    }

    res.status(200).json({ 
        success: true, 
        message: `${setting.name} settings updated successfully`, 
        data: setting 
    });
  } catch (error) { 
      next(error); 
  }
};