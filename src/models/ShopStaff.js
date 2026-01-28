// models/ShopStaff.js
const mongoose = require("mongoose");

const shopStaffSchema = new mongoose.Schema({
  // ১. ইউজার
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  // ২. দোকান (অবশ্যই থাকতে হবে)
  shop: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Shop", 
    required: true 
  },

  // ৩. রোল (শুধুমাত্র type: 'shop' রোলগুলো এখানে বসবে)
  role: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Role", 
    required: true 
  },

  // ৪. এক্সেস লেভেল স্ট্যাটাস
  status: { 
    type: String, 
    enum: ["active", "inactive", "invited"], 
    default: "active" 
  },

  // ৫. কে নিয়োগ দিল? (সাধারণত দোকানের মালিক বা ম্যানেজার)
  addedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "ShopStaff" // অথবা Shop Owner (User)
  },
  
  // ৬. জয়েনিং ডেট (HR ম্যানেজমেন্টের জন্য)
  joinedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// একজন ইউজার এক দোকানে একবারই স্টাফ হতে পারবে
shopStaffSchema.index({ shop: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("ShopStaff", shopStaffSchema);