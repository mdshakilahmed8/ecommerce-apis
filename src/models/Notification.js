const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String },
  type: { type: String, enum: ["order", "alert", "info"], default: "info" },
  isRead: { type: Boolean, default: false },
  link: { type: String }, // e.g., "/admin/orders/123"
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);