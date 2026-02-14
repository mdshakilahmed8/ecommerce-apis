const mongoose = require("mongoose");

const blockedIpSchema = new mongoose.Schema({
  ip: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  reason: { 
    type: String, 
    default: "Suspicious activity" 
  },
  blockedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" // অথবা "Admin" যদি আপনার এডমিন মডেল আলাদা হয়
  }
}, { timestamps: true });

module.exports = mongoose.model("BlockedIp", blockedIpSchema);