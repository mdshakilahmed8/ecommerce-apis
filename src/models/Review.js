const mongoose = require("mongoose");
const Product = require("./Product");

const reviewSchema = new mongoose.Schema({
  review: { 
    type: String, 
    required: [true, "Review can not be empty!"] 
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: true 
  },
  
  // ইমেজ এবং অ্যাপ্রুভাল সিস্টেম
  images: [{ type: String }], 
  isApproved: { type: Boolean, default: false }, // ডিফল্ট: পেন্ডিং

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
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// 1. Prevent Duplicate Review (Unique Compound Index)
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// 2. Populate User Info
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: "user",
    select: "name avatar"
  });
  next();
});

// 3. Static Method: Calculate Avg Rating (Only Approved Reviews)
reviewSchema.statics.calcAverageRatings = async function(productId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        product: productId, 
        isApproved: true // ⚠️ শুধুমাত্র অ্যাপ্রুভড রিভিউ কাউন্ট হবে
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
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 0
    });
  }
};

// 4. Hooks to Trigger Calculation
reviewSchema.post("save", function() {
  // রিভিউ সেভ বা আপডেট হলে ক্যালকুলেশন হবে
  this.constructor.calcAverageRatings(this.product);
});

reviewSchema.post(/^findOneAnd/, async function(doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.product);
  }
});

module.exports = mongoose.model("Review", reviewSchema);