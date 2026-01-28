const mongoose = require("mongoose");

// ভেরিয়েন্ট স্কিমা (SKU)
const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, sparse: true, unique: true }, // Unique Identifier e.g. "TSHIRT-RED-XL"
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  stock: { type: Number, required: true, default: 0 },
  image: { type: String }, // Specific image for variant
  
  // Dynamic Attributes: [{ key: "Color", value: "Red" }, { key: "Size", value: "XL" }]
  attributes: [{
    key: String,
    value: String
  }]
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },

  // Base Price (লিস্টিং পেজে দেখানোর জন্য)
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  
  // গ্যালারি ছবি
  images: [{ type: String }],
  
  // প্রোডাক্ট টাইপ
  hasVariants: { type: Boolean, default: false },
  
  // যদি ভেরিয়েন্ট থাকে, তাহলে এই অ্যারেতে ডাটা থাকবে
  variants: [variantSchema],
  
  // সাধারণ স্টক (যদি ভেরিয়েন্ট না থাকে)
  stock: { type: Number, default: 0 },

  tags: [{ type: String }], // Search optimization
  
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  ratingsAverage: { type: Number, default: 0 },
  ratingsQuantity: { type: Number, default: 0 },
  
  sold: { type: Number, default: 0 } // মোট বিক্রি
}, { timestamps: true });

// ফাস্ট সার্চের জন্য ইনডেক্সিং
productSchema.index({ title: "text", tags: "text" });
productSchema.index({ shop: 1, category: 1 });

module.exports = mongoose.model("Product", productSchema);