const GeneralSetting = require("../models/GeneralSetting");

// 1. Get Settings (No Change)
exports.getGeneralSettings = async (req, res, next) => {
  try {
    let settings = await GeneralSetting.findOne();
    if (!settings) settings = await GeneralSetting.create({});
    res.status(200).json({ success: true, data: settings });
  } catch (error) { next(error); }
};

// 2. Update Settings (Updated to handle colors)
exports.updateGeneralSettings = async (req, res, next) => {
  try {
    let settings = await GeneralSetting.findOne();
    if (!settings) settings = new GeneralSetting();

    // Standard Fields
    const standardFields = [
      "storeName", "tagline", "contactEmail", "contactPhone", 
      "supportPhone", "address", "city", "country", 
      "logoUrl", "faviconUrl", "currency", "currencySymbol",
      "headerVariant" // Added this
    ];

    standardFields.forEach(field => {
        if (req.body[field] !== undefined) settings[field] = req.body[field];
    });

    // 🔥 Handle Colors Object Merge
    if (req.body.colors) {
        settings.colors = { ...settings.colors, ...req.body.colors };
    }

    await settings.save();

    res.status(200).json({ 
        success: true, 
        message: "Settings updated successfully", 
        data: settings 
    });
  } catch (error) { next(error); }
};