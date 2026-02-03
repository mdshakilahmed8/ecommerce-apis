const mongoose = require("mongoose");
const Product = require("./Product");

const reviewSchema = new mongoose.Schema({
  // 1. Review Text
  review: { 
    type: String, 
    required: [true, "Review can not be empty!"] 
  },
  
  // 2. Rating (1 to 5)
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: [true, "Rating is required"] 
  },
  
  // 3. Review Images
  images: [{ type: String }], 
  
  // 4. Approval Status (Default: Pending)
  isApproved: { 
    type: Boolean, 
    default: false 
  },

  // 5. Admin Reply Section
  adminReply: { type: String }, 
  adminRepliedAt: { type: Date },

  // 6. Timestamps & Relations
  createdAt: { type: Date, default: Date.now },
  
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: [true, "Review must belong to a product."]
  },
  
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Review must belong to a user"]
  }
}, {
    // Virtual fields শো করার জন্য
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// --- INDEXES ---
// Prevent Duplicate Review: একজন ইউজার একটা প্রোডাক্টে একবারই রিভিউ দিতে পারবে
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// --- MIDDLEWARE (HOOKS) ---

// 1. Populate User Info Automatically
// Note: এখানে 'next' ব্যবহার করা হয়নি সেফটির জন্য
reviewSchema.pre(/^find/, function() {
  this.populate({
    path: "user",
    select: "name avatar" // ইউজারের পাসওয়ার্ড বা সেনসিটিভ ডাটা যাতে না আসে
  });
});

// 2. Static Method: Calculate Avg Rating & Quantity
reviewSchema.statics.calcAverageRatings = async function(productId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        product: productId, 
        isApproved: true // ⚠️ শুধুমাত্র অ্যাপ্রুভ করা রিভিউ কাউন্ট হবে
      } 
    },
    {
      $group: {
        _id: "$product",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    // যদি সব রিভিউ ডিলিট হয়ে যায় বা হাইড করা হয়
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 0
    });
  }
};

// 3. Hook: Call calculation AFTER saving a new review
reviewSchema.post("save", function() {
  // this.constructor points to the Model
  this.constructor.calcAverageRatings(this.product);
});

// 4. Hook: Call calculation AFTER updating or deleting a review
// (findByIdAndUpdate & findByIdAndDelete triggers this)
reviewSchema.post(/^findOneAnd/, async function(doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.product);
  }
});

module.exports = mongoose.model("Review", reviewSchema);