const mongoose = require("mongoose");
const slugify = require("slugify");

const variantSchema = new mongoose.Schema({
  sku: { type: String, sparse: true }, 
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  image: String,
  attributes: { type: Map, of: String }
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, index: true },
  
  // ✅ NEW FIELD: কার্ডে বা টাইটেলের নিচে দেখানোর জন্য
  shortDescription: { 
      type: String, 
      required: true, // সাধারণত এটা ম্যান্ডেটরি রাখা ভালো
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters"] // লিমিট দিয়ে দিলাম
  },

  // ✅ FULL DESCRIPTION: ডিটেইলস পেইজের জন্য
  description: { type: String, required: true },
  
  // References
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" }, 

  // Pricing
  price: { type: Number, required: true }, 
  discountPrice: { type: Number }, 

  images: [{ type: String }],
  
  // Inventory & Variants
  hasVariants: { type: Boolean, default: false },
  variants: [variantSchema],
  stock: { type: Number, default: 0 }, 

  tags: [String],
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Analytics
  sold: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  
  ratingsAverage: { type: Number, default: 0 },
  ratingsQuantity: { type: Number, default: 0 }

}, { timestamps: true });

// ✅ Indexing Update: shortDescription ও সার্চে আসবে
productSchema.index({ title: "text", tags: "text", shortDescription: "text", description: "text" });

// Auto Slug Generator
productSchema.pre("save", async function () {
  if (this.isModified("title") && !this.slug) {
     let tempSlug = slugify(this.title, { lower: true, strict: true });
     this.slug = tempSlug + "-" + Date.now(); // ইউনিকনেস গ্যারান্টি দিলাম
  }
});

module.exports = mongoose.model("Product", productSchema);