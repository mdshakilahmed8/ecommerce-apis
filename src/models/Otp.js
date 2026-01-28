const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true }, // Full Phone (+88017...)
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // ৫ মিনিট পর অটো ডিলিট
});

module.exports = mongoose.model("Otp", otpSchema);