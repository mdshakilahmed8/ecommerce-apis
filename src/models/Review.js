const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" }, // শপের রেটিং ক্যালকুলেট করতে কাজে লাগবে
  
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  images: [{ type: String }],
  
  isApproved: { type: Boolean, default: true } // স্প্যাম ঠেকানোর জন্য
}, { timestamps: true });

// একজন ইউজার এক প্রোডাক্টে একবারই রিভিও দিতে পারবে
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);