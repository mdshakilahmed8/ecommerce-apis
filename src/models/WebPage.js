const mongoose = require("mongoose");

const webPageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // e.g. 'about-us', 'privacy-policy'
  content: { type: String, default: "" }, // HTML ba Text content thakbe
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("WebPage", webPageSchema);