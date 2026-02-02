const mongoose = require("mongoose");
const slugify = require("slugify");

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, unique: true, index: true },
  description: String,
  logo: String,
  website: String,
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

// --- SMART SLUG GENERATOR ---
brandSchema.pre("save", async function () {
  // ১. যদি ইউজার ম্যানুয়ালি স্ল্যাগ দেয়
  if (this.slug) {
    this.slug = slugify(this.slug, { lower: true, strict: true });
  } 
  // ২. যদি স্ল্যাগ না দেয় কিন্তু নাম মডিফাই হয় বা স্ল্যাগ নেই
  else if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

module.exports = mongoose.model("Brand", brandSchema);