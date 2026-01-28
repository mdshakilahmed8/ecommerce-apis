const mongoose = require("mongoose");

const abandonedCheckoutSchema = new mongoose.Schema({
  // 1. Tracking ID (Guest user der track korar jonno)
  // Frontend local storage e ekta 'guestId' generate kore rakhbe
  guestId: { type: String, index: true }, 
  
  // Jodi logged in user hoy
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 2. Captured Data (Je data gulo user type koreche)
  // Ekhane kono field 'required' hobe na, karon user halfway chere dite pare
  customerDetails: {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    
    // Previous standard onujayi phone object
    phone: { 
      countryCode: { type: String, default: "+880" },
      number: { type: String, trim: true } 
    },

    address: String,
    city: String,
    area: String
  },

  // 3. Cart Items (Se ki kinte cheyechilo)
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variantId: mongoose.Schema.Types.ObjectId,
    name: String,
    sku: String,
    image: String,
    price: Number,
    quantity: Number,
    total: Number
  }],

  // Financials
  subTotal: Number,
  grandTotal: Number,

  // 4. Recovery Status
  // Order complete hole amra eta 'true' kore dibo, ba entry ta delete kore dibo
  isRecovered: { type: Boolean, default: false }, 
  
  // User kothay drop koreche? (Analytics er jonno)
  dropOffStage: { 
    type: String, 
    enum: ["cart_view", "contact_info", "shipping_info", "payment_method"],
    default: "contact_info"
  },

  // 5. Recovery Attempts (Call/SMS history)
  recoveryLogs: [{
    method: { type: String, enum: ["sms", "email", "call"] },
    note: String, // "Customer bollo pore nibe"
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin Staff
    date: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// --- AUTO DELETE (Optional) ---
// 30 din por ai data auto delete hoye jabe, karon 1 mash purono lead sales e convert hoy na.
// expireAfterSeconds: 30 * 24 * 60 * 60 = 2592000 seconds
abandonedCheckoutSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("AbandonedCheckout", abandonedCheckoutSchema);