const mongoose = require("mongoose");

const abandonedCheckoutSchema = new mongoose.Schema({
  // ১. আইডেন্টিফিকেশন
  guestId: { type: String, index: true }, 
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 

  // ২. আইটেম (অর্ডার মডেলের মতো সেম স্ট্রাকচার)
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variantId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    // ভিউ করার জন্য কিছু ডাটা রাখা, তবে অর্ডার প্লেস করার সময় রি-ক্যালকুলেট হবে
    price: Number, 
    total: Number
  }],
  ipAddress: { type: String },

  // ৩. শিপিং এড্রেস (অর্ডার মডেলের মতো সেম স্ট্রাকচার)
  shippingAddress: {
    fullName: { type: String, trim: true },
    fullAddress: String, 
    phone: { 
        countryCode: { type: String, default: "880" },
        number: { type: String, trim: true }
    },
    city: String,
    area: String,
    zip: String,
    email: String
  },

  // ৪. ফিন্যান্সিয়াল
  subTotal: Number,
  shippingFee: Number,
  discount: Number,
  grandTotal: Number,

  // ৫. স্ট্যাটাস
  dropOffStage: { 
    type: String, 
    enum: ["cart_view", "checkout_init", "shipping_info", "payment_method"],
    default: "checkout_init"
  },

    management: {
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["new", "processing", "follow_up", "confirmed", "cancelled"], default: "new" },
        logs: [{
            action: String,
            note: String, 
            admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            date: { type: Date, default: Date.now }
        }]
    },
  
  
  isRecovered: { type: Boolean, default: false }, 
  isRecoveredByOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }

}, { timestamps: true });

abandonedCheckoutSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("AbandonedCheckout", abandonedCheckoutSchema);