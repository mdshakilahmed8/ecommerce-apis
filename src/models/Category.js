const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, index: true },
  icon: String, 
  image: String,
  
  // Parent-Child Relation
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category", 
    default: null,
    index: true 
  },

  // Optimized for Breadcrumbs
  ancestors: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    name: String,
    slug: String
  }],
  
  level: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0 } 

}, { timestamps: true });

// Auto Slug & Hierarchy Middleware
categorySchema.pre("save", async function () {
  
  // ১. স্লাগ জেনারেট
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  // ২. প্যারেন্ট-চাইল্ড রিলেশন (Hierarchy)
  if (this.parentId) {
    const parent = await mongoose.model("Category").findById(this.parentId);
    if (parent) {
      this.ancestors = [...parent.ancestors, { _id: parent._id, name: parent.name, slug: parent.slug }];
      this.level = parent.level + 1;
    }
  } else {
    this.ancestors = [];
    this.level = 0;
  }
  
});

module.exports = mongoose.model("Category", categorySchema);