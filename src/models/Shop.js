const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String },
  
  logo: { type: String },
  coverImage: { type: String },

  // --- BUSINESS SETTINGS (NEW) ---
  // আপনার ইনকাম এবং ভেন্ডরের ব্যালেন্স ম্যানেজ করার জন্য
  commissionRate: { 
    type: Number, 
    default: 10, // ডিফল্ট ১০% কমিশন আপনি পাবেন
    min: 0, 
    max: 100 
  },
  
  walletBalance: { 
    type: Number, 
    default: 0, // ভেন্ডরের বর্তমান ব্যালেন্স
    // index: true // ফিনান্সিয়াল কুয়েরির জন্য ইনডেক্স করা ভালো
  },

  // নেগেটিভ ব্যালেন্স কতটুকু পর্যন্ত এলাউ করবেন? (e.g. -500 টাকা পর্যন্ত অর্ডার নিতে পারবে)
  negativeBalanceLimit: { type: Number, default: -500 },
  // ------------------------------

  paymentInfo: {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    branch: String
  },

  address: {
    street: String,
    city: String,
    zip: String,
    country: String
  },

  status: { 
    type: String, 
    enum: ["pending", "active", "rejected", "banned"], 
    default: "pending" 
  },

  isActive: { type: Boolean, default: true },
  
  ratingsAverage: { type: Number, default: 0 },
  ratingsQuantity: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Shop", shopSchema);