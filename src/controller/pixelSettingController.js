const PixelSetting = require("../models/PixelSetting");
const createError = require("http-errors");

// 🔥 3 New high-value tools added
const DEFAULT_PIXELS = [
  { provider: "facebook", name: "Facebook Pixel & CAPI", isActive: false },
  { provider: "ga4", name: "Google Analytics 4 (GA4)", isActive: false },
  { provider: "tiktok", name: "TikTok Pixel & Events API", isActive: false },
  { provider: "pinterest", name: "Pinterest Tag & API", isActive: false },
  { provider: "snapchat", name: "Snapchat Pixel & CAPI", isActive: false },
  { provider: "clarity", name: "Microsoft Clarity (Heatmaps)", isActive: false },
  { provider: "gsc", name: "Google Search Console", isActive: false }
];

exports.getAllPixelSettings = async (req, res, next) => {
  try {
    let settings = await PixelSetting.find({});
    const existingProviders = settings.map(s => s.provider);
    
    const missingPixels = DEFAULT_PIXELS.filter(
        p => !existingProviders.includes(p.provider)
    );

    if (missingPixels.length > 0) {
        const newSettings = await PixelSetting.insertMany(missingPixels);
        settings = [...settings, ...newSettings];
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};

exports.updatePixelSetting = async (req, res, next) => {
  try {
    const { provider, isActive, pixelId, accessToken, testEventCode } = req.body;
    
    // 🔥 Allowed providers list updated
    if(!["facebook", "ga4", "tiktok", "gsc", "clarity", "pinterest", "snapchat"].includes(provider)) {
      throw createError(400, "Invalid provider");
    }

    let setting = await PixelSetting.findOne({ provider });

    if (setting) {
      if(pixelId !== undefined) setting.pixelId = pixelId;
      if(accessToken !== undefined) setting.accessToken = accessToken;
      if(testEventCode !== undefined) setting.testEventCode = testEventCode;
      if(typeof isActive !== 'undefined') setting.isActive = isActive;
      
      await setting.save();
    } else {
      setting = await PixelSetting.create(req.body);
    }

    res.status(200).json({ 
        success: true, 
        message: `${setting.name} updated successfully`, 
        data: setting 
    });
  } catch (error) { 
      next(error); 
  }
};


exports.getPublicPixelSettings = async (req, res, next) => {
  try {
    // শুধুমাত্র isActive: true গুলো পাঠাবো এবং accessToken বা testEventCode পাঠাবো না (Security)
    const settings = await PixelSetting.find({ isActive: true }).select("-accessToken -testEventCode");
    
    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};