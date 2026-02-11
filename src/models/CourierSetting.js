const mongoose = require("mongoose");

const courierSettingSchema = new mongoose.Schema({
  provider: { 
      type: String, 
      required: true, 
      enum: ["pathao", "steadfast"], 
      unique: true 
  },
  name: { type: String, required: true },
  
  // Credentials
  apiKey: { type: String, default: "" },      // Steadfast API Key / Pathao Client ID
  secretKey: { type: String, default: "" },   // Steadfast Secret Key / Pathao Client Secret
  
  // Pathao Specific
  username: { type: String, default: "" },
  password: { type: String, default: "" },
  storeId: { type: String, default: "" },

  baseUrl: { type: String, default: "" }, // API URL

  isSandbox: { type: Boolean, default: false }, 
  isActive: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("CourierSetting", courierSettingSchema);