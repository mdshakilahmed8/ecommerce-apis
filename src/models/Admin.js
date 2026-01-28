// models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  // ১. ইউজার রেফারেন্স (লগইন ক্রেডেনশিয়াল User মডেলে থাকবে)
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true 
  },

  // ২. সিস্টেম রোল (শুধুমাত্র type: 'system' রোলগুলো এখানে বসবে)
  role: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Role", 
    required: true 
  },

  // ৩. ডিপার্টমেন্ট (অপশনাল - বড় কোম্পানির জন্য)
  department: { type: String }, // e.g., "IT", "Marketing", "Accounts"

  // ৪. কে এই এমপ্লয়িকে নিয়োগ দিয়েছে? (Audit Trail)
  addedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin" // অন্য একজন এডমিন তাকে অ্যাড করবে
  },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);