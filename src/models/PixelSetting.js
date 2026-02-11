const mongoose = require("mongoose");

const pixelSettingSchema = new mongoose.Schema({
  provider: { 
    type: String, 
    required: true, 
    // 🔥 Added clarity, pinterest, snapchat
    enum: ["facebook", "ga4", "tiktok", "gsc", "clarity", "pinterest", "snapchat"], 
    unique: true 
  },
  name: { type: String, required: true },
  
  pixelId: { type: String, default: "" }, 
  accessToken: { type: String, default: "" }, 
  testEventCode: { type: String, default: "" }, 
  
  isActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("PixelSetting", pixelSettingSchema);