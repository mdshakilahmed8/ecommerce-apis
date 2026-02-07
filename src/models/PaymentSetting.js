const mongoose = require("mongoose");

const paymentSettingSchema = new mongoose.Schema({
  // provider: 'sslcommerz', 'bkash', 'nagad', 'cod'
  provider: { 
      type: String, 
      required: true, 
      enum: ["sslcommerz", "bkash", "nagad", "cod"], 
      unique: true 
  },
  
  // Credentials (Not needed for COD)
  storeId: { type: String },       // SSL: StoreID, bKash: App Key, Nagad: Merchant ID
  storePassword: { type: String }, // SSL: Password, bKash: App Secret
  
  // bKash Specific
  username: { type: String }, 
  password: { type: String },
  
  // Nagad Specific
  publicKey: { type: String },     
  privateKey: { type: String },    
  
  isSandbox: { type: Boolean, default: true }, 
  isActive: { type: Boolean, default: true } // 🔥 এটা দিয়ে অন/অফ করবেন

}, { timestamps: true });

module.exports = mongoose.model("PaymentSetting", paymentSettingSchema);