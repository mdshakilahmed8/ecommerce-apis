const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, 
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // পেমেন্ট ইনফো (Global)
  totalAmount: { type: Number, required: true }, // ডিসকাউন্টের আগে
  grandTotal: { type: Number, required: true }, // সব মিলিয়ে (Payable)
  
  paymentMethod: { type: String, enum: ["COD", "Online", "Wallet"], default: "COD" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },

  // --- SUB-ORDERS (International Standard) ---
  subOrders: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // সাব-অর্ডারের নিজস্ব ID
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      variantId: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      price: Number,
      quantity: Number,
      sku: String,
      image: String
    }],

    shippingFee: Number,
    discount: Number,
    payableAmount: Number, // (Price * Qty) + Shipping - Discount

    // --- Delivery Logic ---
    deliveryType: { 
      type: String, 
      enum: ["shop_managed", "platform_managed"], 
      default: "shop_managed" 
    },

    courierInfo: {
      courierName: String, // e.g. "Pathao", "RedX",Or "Own Delivery"
      trackingId: String,
      deliveryManName: String,
      deliveryManPhone: String,
      receiptImage: String // ভেন্ডর ক্যাশ মেমোর ছবি আপলোড করতে পারবে
    },

    // --- Dynamic Status & Timeline ---
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"], 
      default: "pending" 
    },
    
    // কে কখন স্ট্যাটাস চেঞ্জ করলো তার প্রমাণ
    timeline: [{
      status: String, 
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Shop Staff or Admin ID
      date: { type: Date, default: Date.now },
      note: String
    }]

  }],

  // Global Status (কাস্টমারের দেখার সুবিধার জন্য)
  orderStatus: { type: String, default: "processing" },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);