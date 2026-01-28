const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, 
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: mongoose.Schema.Types.ObjectId,
    name: String,
    sku: String,
    image: String,
    price: Number, 
    quantity: Number,
    total: Number 
  }],

  // --- SHIPPING ADDRESS & PHONE ---
  shippingAddress: {
    fullName: String,
    
    // Updated Object Structure
    phone: { 
        countryCode: { type: String, default: "+880" },
        number: { type: String, required: true }
    },
    
    address: String,
    city: String,
    area: String,
    zip: String
  },

  paymentMethod: { type: String, enum: ["COD", "Online"], default: "COD" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  
  subTotal: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true }, 

  status: { 
    type: String, 
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"], 
    default: "pending" 
  },

  courier: {
    provider: String, 
    trackingId: String,
    link: String
  },

  timeline: [{
    status: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
    note: String
  }],
  
  deliveredAt: Date

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);