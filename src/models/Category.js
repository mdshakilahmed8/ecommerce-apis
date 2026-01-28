const mongoose = require("mongoose");
const slugify = require("slugify"); 

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Category name is required"], 
    trim: true 
  },
  
  slug: { 
    type: String, 
    unique: true, 
    index: true 
  },
  
  icon: { type: String }, // For mobile app or menu icons
  image: { type: String }, // Category banner image
  description: { type: String },

  // --- HIERARCHY MANAGEMENT (The Upgrade) ---
  
  // Just immediate parent (Age jemon chilo)
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category", 
    default: null,
    index: true 
  },

  // Ancestors Array: Breadcrumb er jonno magic field.
  // Example: Electronics > Mobile > iPhone
  // iPhone er ancestors hobe: [{id: 'elec_id', name: 'Electronics'}, {id: 'mob_id', name: 'Mobile'}]
  // Ate query fast hobe, join kora lagbe na.
  ancestors: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    name: String,
    slug: String
  }],

  // Level manage kora (Root = 0, Sub = 1, Sub-Sub = 2)
  // Frontend e menu sajate subidha hobe.
  level: { type: Number, default: 0 },

  // ------------------------------------------

  isFeatured: { type: Boolean, default: false }, // Homepage e dekhabe kina
  isActive: { type: Boolean, default: true }, // Delete na kore hide korar jonno
  
  // Sorting order (Menu te konta age dekhabe)
  order: { type: Number, default: 0 } 

}, { timestamps: true });

// --- MIDDLEWARE AUTOMATION ---
// Category save korar age automatic slug, level, ebong ancestors set hobe
categorySchema.pre("save", async function (next) {
  
  // 1. Slug Generate
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  // 2. Hierarchy Logic
  if (this.parentId) {
    const parent = await mongoose.model("Category").findById(this.parentId);
    
    if (parent) {
      // Parent er ancestors copy koro + Parent keo add koro
      this.ancestors = [...parent.ancestors, { 
        _id: parent._id, 
        name: parent.name, 
        slug: parent.slug 
      }];
      
      // Parent er level theke 1 baraye dao
      this.level = parent.level + 1;
    }
  } else {
    // Parent na thakle eta Root category
    this.ancestors = [];
    this.level = 0;
  }

  next();
});

module.exports = mongoose.model("Category", categorySchema);