const GeneralSetting = require("../models/GeneralSetting");

// 1. Get Settings
exports.getGeneralSettings = async (req, res, next) => {
  try {
    let settings = await GeneralSetting.findOne();
    
    // DB খালি থাকলে ডিফল্ট তৈরি করবে
    if (!settings) {
      settings = await GeneralSetting.create({});
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};

// 2. Update Settings
exports.updateGeneralSettings = async (req, res, next) => {
  try {
    let settings = await GeneralSetting.findOne();

    if (!settings) {
      settings = new GeneralSetting();
    }

    // Update dynamically
    const updateFields = [
      "storeName", "tagline", "contactEmail", "contactPhone", 
      "supportPhone", "address", "city", "country", 
      "logoUrl", "faviconUrl", "currency", "currencySymbol"
    ];

    updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
            settings[field] = req.body[field];
        }
    });

    await settings.save();

    res.status(200).json({ 
        success: true, 
        message: "General settings updated successfully", 
        data: settings 
    });
  } catch (error) { 
      next(error); 
  }
};