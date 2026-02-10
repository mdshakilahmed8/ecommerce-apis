const mongoose = require("mongoose");

const smsLogSchema = new mongoose.Schema({
  // যার কাছে পাঠানো হলো
  recipient: { 
    type: String, 
    required: true 
  },
  
  // মেসেজ কন্টেন্ট
  message: { 
    type: String, 
    required: true 
  },

  // কোন প্রোভাইডার দিয়ে পাঠানো হয়েছে (যাতে পরে চেঞ্জ করলে ট্র্যাক থাকে)
  provider: { 
    type: String, 
    default: "bulksmsbd" 
  },

  // গেটওয়ে থেকে পাওয়া মেসেজ আইডি (ট্র্যাকিং এর জন্য)
  gatewayMessageId: { 
    type: String 
  },

  // স্ট্যাটাস
  status: { 
    type: String, 
    enum: ["sent", "failed", "pending"], 
    default: "pending" 
  },

  // কস্ট (প্রতি এসএমএস এর দাম, অপশনাল)
  cost: { 
    type: Number, 
    default: 0.25 // উদাহরণস্বরূপ ২৫ পয়সা
  },

  // কে পাঠিয়েছে (Admin Reference)
  sentBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }

}, { timestamps: true });

module.exports = mongoose.model("SmsLog", smsLogSchema);