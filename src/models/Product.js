const mongoose = require("mongoose");

// Variant Schema
const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, sparse: true }, 
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  image: String,
  attributes: { type: Map, of: String } // { Color: "Red", Size: "XL" } - Better for querying
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  
  // References
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" }, // Optional

  // Pricing
  price: { type: Number, required: true }, // Base Price
  discountPrice: { type: Number }, // Optional Sale Price

  images: [{ type: String }],
  
  // Inventory Logic
  hasVariants: { type: Boolean, default: false },
  variants: [variantSchema],
  stock: { type: Number, default: 0 }, // For non-variant products

  tags: [String],
  isPublished: { type: Boolean, default: true },
  
  // Analytics
  sold: { type: Number, default: 0 },
  ratingsAverage: { type: Number, default: 0 },
  ratingsQuantity: { type: Number, default: 0 }

}, { timestamps: true });

productSchema.index({ title: "text", tags: "text" });

module.exports = mongoose.model("Product", productSchema);