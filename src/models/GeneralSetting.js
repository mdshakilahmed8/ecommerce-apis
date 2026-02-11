const mongoose = require("mongoose");

const generalSettingSchema = new mongoose.Schema({
  // Basic Info
  storeName: { type: String, default: "My E-Commerce" },
  tagline: { type: String, default: "" },
  
  // Contact Info
  contactEmail: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  supportPhone: { type: String, default: "" },
  
  // Address
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  country: { type: String, default: "Bangladesh" },
  
  // Assets / Branding (URLs will be saved here)
  logoUrl: { type: String, default: "" },
  faviconUrl: { type: String, default: "" },
  
  // Regional
  currency: { type: String, default: "BDT" },
  currencySymbol: { type: String, default: "৳" }
}, { timestamps: true });

module.exports = mongoose.model("GeneralSetting", generalSettingSchema);