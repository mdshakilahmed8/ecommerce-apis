const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  description: { type: String }, // Optional description
  discountType: { 
    type: String, 
    enum: ["percentage", "fixed"], 
    required: true 
  },
  discountAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  minOrderAmount: { type: Number, default: 0 }, // Minimum cart value to apply
  maxDiscountAmount: { type: Number }, // Cap on discount for percentage type
  usageLimit: { type: Number, default: null }, // Total times this coupon can be used
  usageCount: { type: Number, default: 0 }, // Tracks how many times it has been used
  perUserLimit: { type: Number, default: 1 }, // Max times a single user can use it
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true }, // Expiry date
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.isActive &&
    this.startDate <= now &&
    this.endDate >= now &&
    (this.usageLimit === null || this.usageCount < this.usageLimit)
  );
};

module.exports = mongoose.model("Coupon", couponSchema);