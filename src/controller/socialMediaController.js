const SocialMediaSetting = require("../models/SocialMediaSetting");

// ডিফল্ট সোশ্যাল মিডিয়া প্ল্যাটফর্মগুলো
const DEFAULT_LINKS = [
  { platform: "facebook", name: "Facebook", url: "", isActive: false },
  { platform: "instagram", name: "Instagram", url: "", isActive: false },
  { platform: "youtube", name: "YouTube", url: "", isActive: false },
  { platform: "twitter", name: "Twitter / X", url: "", isActive: false },
  { platform: "linkedin", name: "LinkedIn", url: "", isActive: false }
];

// 1. Get Settings
exports.getSocialMediaSettings = async (req, res, next) => {
  try {
    let settings = await SocialMediaSetting.findOne();
    
    // ডাটাবেজ খালি থাকলে ডিফল্টগুলো ইনসার্ট করে নিবে
    if (!settings) {
      settings = await SocialMediaSetting.create({ links: DEFAULT_LINKS });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};

// 2. Update Settings
exports.updateSocialMediaSettings = async (req, res, next) => {
  try {
    let settings = await SocialMediaSetting.findOne();

    if (!settings) {
      settings = new SocialMediaSetting();
    }

    const { links } = req.body;

    if(links !== undefined) {
        settings.links = links;
    }

    await settings.save();

    res.status(200).json({ 
        success: true, 
        message: "Social media links updated successfully", 
        data: settings 
    });
  } catch (error) { 
      next(error); 
  }
};