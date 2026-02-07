const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // 1. Order ID & User Link
  orderId: { type: String, required: true, unique: true }, 
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  guestId: { type: String },
  ipAddress: { type: String },
  
  // 2. Ordered Items (Snapshot from DB)
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: mongoose.Schema.Types.ObjectId, // Optional
    name: String,   // Saved from DB at time of order
    sku: String,    // Saved from DB
    image: String,  // Saved from DB
    price: Number,  // Saved from DB
    quantity: Number,
    total: Number 
  }],

  // 3. Shipping Info
  shippingAddress: {
    fullName: String,
    fullAddress: String, // Main address field
    phone: { 
        countryCode: { type: String, default: "+880" },
        number: { type: String, required: true }
    },
    city: String,
    area: String,
    zip: String,
    email: String
  },

  // 4. Payment Info
  paymentMethod: { type: String, enum: ["sslcommerz", "bkash", "nagad", "cod"], default: "cod" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  
  // 5. Financials (Calculated on Backend)
  subTotal: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true }, 

  // 6. Order Status
  status: { 
    type: String, 
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"], 
    default: "pending" 
  },

  // 7. Courier Info
  courier: {
    provider: String, 
    trackingId: String,
    link: String
  },

  // 8. Finance: Courier Settlement
  courierSettlement: {
      isSettled: { type: Boolean, default: false },
      amountReceived: { type: Number, default: 0 },
      transactionId: String,
      date: Date,
      note: String
  },

  // 9. Admin CRM
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

  // 10. Timeline
  timeline: [{
    status: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
    note: String
  }],
  
  deliveredAt: Date

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);