const mongoose = require("mongoose");

const smsGatewaySchema = new mongoose.Schema({
  // Provider Identifier (e.g., 'bulksmsbd', 'greenweb')
  provider: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Display Name (e.g., 'BulkSMS BD')
  name: { 
    type: String, 
    required: true 
  },

  // Credentials
  apiKey: { type: String, default: "" },
  senderId: { type: String, default: "" },
  baseUrl: { type: String, default: "" }, // API URL

  // Status
  status: { 
    type: String, 
    enum: ["active", "inactive"], 
    default: "inactive" 
  },

}, { timestamps: true });

module.exports = mongoose.model("SmsGateway", smsGatewaySchema);