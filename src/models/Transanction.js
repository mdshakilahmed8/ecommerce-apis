const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  
  // কোন অর্ডারের জন্য এই ট্রানজেকশন? (Top-up বা Withdraw এর ক্ষেত্রে null হতে পারে)
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  
  // 1. Credit = শপের ব্যালেন্স বাড়বে (Top-up করলে বা Online Order পেলে)
  // 2. Debit = শপের ব্যালেন্স কমবে (Commission কাটলে বা টাকা তুললে)
  type: { 
    type: String, 
    enum: ["credit", "debit"], 
    required: true 
  },
  
  amount: { type: Number, required: true }, 
  balanceAfter: { type: Number }, // এই ট্রানজেকশনের পর ব্যালেন্স কত হলো (History)

  // ট্রানজেকশনের কারণ
  reason: { 
    type: String, 
    enum: [
      "wallet_topup",        // ভেন্ডর টাকা রিচার্জ করলো (Credit)
      "commission_deduction", // অর্ডার কনফার্ম করার পর আপনি কমিশন কাটলেন (Debit)
      "sale_proceed_online",  // অনলাইন পেমেন্টের টাকা ভেন্ডর পেল (Credit)
      "withdraw_processed",   // ভেন্ডর টাকা তুলে নিল (Debit)
      "refund_adjustment"     // অর্ডার ক্যান্সেল বা রিফান্ড (Credit/Debit)
    ],
    required: true
  },

  description: String, // e.g., "Commission for Order #ORD-1001"
  
  // ব্যাংকিং রেফারেন্স (যদি থাকে)
  paymentGatewayTrxId: String, // Bkash/Nagad Trx ID

  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" }

}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);