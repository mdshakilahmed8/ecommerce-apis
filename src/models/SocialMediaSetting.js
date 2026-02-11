const mongoose = require("mongoose");

const socialMediaSchema = new mongoose.Schema({
  links: [
    {
      platform: { type: String, required: true }, // e.g., 'facebook', 'instagram', 'youtube'
      name: { type: String, required: true },     // e.g., 'Facebook', 'Instagram'
      url: { type: String, default: "" },
      isActive: { type: Boolean, default: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("SocialMediaSetting", socialMediaSchema);