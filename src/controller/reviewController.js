const Review = require("../models/Review");
const Product = require("../models/Product");
const createError = require("http-errors");
const cloudinary = require("../config/cloudinary");

// Helper: Cloudinary Upload
const uploadToCloudinary = async (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
};

// 1. Create Review (User)
exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, review } = req.body;
    const userId = req.user._id;

    // A. Product Check
    const product = await Product.findById(productId);
    if (!product) throw createError(404, "Product not found");

    // B. Duplicate Review Check
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
        throw createError(409, "You have already reviewed this product");
    }

    // C. Image Upload
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(file => uploadToCloudinary(file, "reviews"));
        imageUrls = await Promise.all(uploadPromises);
    }

    // D. Create Review
    const newReview = await Review.create({
      product: productId,
      user: userId,
      rating: Number(rating),
      review,
      images: imageUrls,
      isApproved: false // Explicitly false
    });

    res.status(201).json({
      success: true,
      message: "Review submitted! It will be visible after admin approval.",
      data: newReview
    });

  } catch (error) {
    next(error);
  }
};

// 2. Get Product Reviews (Public - Only Approved)
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    const reviews = await Review.find({ product: productId, isApproved: true })
        .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });

  } catch (error) {
    next(error);
  }
};

// 3. ADMIN: Get All Reviews (With Pagination & Product Filter)
exports.getAllReviewsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status, productId } = req.query;

    let query = {};
    
    if (status === "pending") query.isApproved = false;
    if (status === "approved") query.isApproved = true;
    if (productId) query.product = productId; // 🔥 Product Based Filter

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
        .populate("product", "title slug")
        .populate("user", "name avatar") 
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalDocuments = await Review.countDocuments(query);
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      success: true,
      meta: {
        totalReviews: totalDocuments,
        totalPages: totalPages,
        currentPage: page,
        reviewsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// 4. ADMIN: Approve or Reject Review
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const { isApproved } = req.body; // true or false
    const review = await Review.findById(req.params.id);

    if (!review) throw createError(404, "Review not found");

    review.isApproved = isApproved;
    await review.save(); // save() will trigger calcAverageRatings

    res.status(200).json({
      success: true,
      message: `Review ${isApproved ? "Approved" : "Hidden"} successfully`,
      data: review
    });

  } catch (error) {
    next(error);
  }
};

// 5. Delete Review (User or Admin)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) throw createError(404, "Review not found");

    // Owner check or Admin check
    if (review.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      throw createError(403, "You are not authorized to delete this review");
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};


//Admin Reply Function
exports.adminReplyToReview = async (req, res, next) => {
  try {
    const { reply } = req.body;
    const reviewId = req.params.id;

    if (!reply) {
        throw createError(400, "Reply message is required");
    }

    const review = await Review.findById(reviewId);
    if (!review) throw createError(404, "Review not found");

    // রিপ্লাই আপডেট করা
    review.adminReply = reply;
    review.adminRepliedAt = Date.now();
    
    // রিভিউ যদি আগে পেন্ডিং থাকে, রিপ্লাই দেওয়ার সাথে সাথে সেটা অ্যাপ্রুভ করে দেওয়া ভালো (অপশনাল)
    // review.isApproved = true; 

    await review.save();

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: review
    });

  } catch (error) {
    next(error);
  }
};