const mongoose = require("mongoose");

const shippingSettingSchema = new mongoose.Schema({
  // 🔥 Dynamic Delivery Zones
  deliveryZones: [
    {
      name: { type: String, required: true }, // e.g. "Inside Dhaka", "Sylhet City"
      cost: { type: Number, required: true, default: 0 } // e.g. 60, 150
    }
  ],

  // Store Pickup
  isStorePickupActive: { type: Boolean, default: true },

  // Free Shipping Rule
  isFreeShippingActive: { type: Boolean, default: false },
  freeShippingThreshold: { type: Number, default: 5000 },

}, { timestamps: true });

module.exports = mongoose.model("ShippingSetting", shippingSettingSchema);