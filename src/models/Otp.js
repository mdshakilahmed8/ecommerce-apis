const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  // Phone Object
  phone: { 
    countryCode: { type: String, required: true },
    number: { type: String, required: true }
  },
  
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // 5 minutes
});

// OTP match korar somoy country code + number diye khujte hobe
otpSchema.index({ "phone.countryCode": 1, "phone.number": 1 });

module.exports = mongoose.model("Otp", otpSchema);