const mongoose = require("mongoose");

const landingPageSchema = new mongoose.Schema({
  // 1. Basic Configuration
  title: { type: String, required: true, trim: true }, // Admin Internal Name
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
  
  // 2. Hero Section
  hero: {
    guaranteeText: { type: String, required: true },
    heading: { type: String, required: true },
    subHeading: { type: String, required: true },
    videoUrl: { type: String, required: true },
    buttonText: { type: String, required: true }
  },

  // 3. Features Section (Why Choose Us)
  features: {
    heading: { type: String, required: true },
    subHeading: { type: String, required: true },
    featuresList: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      icon: { type: String, required: true }
    }]
 } ,

  // 4. Product Story Section
  story:[
     {
    title: { type: String, default: "" },
    description: { type: String, default: "" }, // Long Text
    image: { type: String, default: "" } // Image URL
  },
  ],

  // 5. Products Linked (Inventory Reference)
  products: {
    heading: { type: String, required: true },

    productList:[{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    tag: { type: String, default: "" } // e.g. 'Best Seller'
  }],
  },

  // 6. Customer Reviews (With Image)
  reviews: {
    heading: { type: String, required: true },
    subHeading: { type: String, required: true },
    ratingsSubHeading: { 
        ratings: { type: Number, required: true, min: 0, max: 5 },
        totalReviews: { type: String, required: true }
        },
    reviewList: [{
        name: { type: String, required: true },
        rating: { type: Number, default: 5 },
        comment: { type: String, required: true },
        date: { type: String, required: true },
        type: { type: String, default: "Verified Purchase" },
        image: { type: String, default: "" }
  }]

  }

}, { timestamps: true });

module.exports = mongoose.model("LandingPage", landingPageSchema);