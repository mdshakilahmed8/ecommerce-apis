const Order = require("../models/Order");
const createError = require("http-errors");
const paymentController = require("./paymentController"); 
const User = require("../models/User"); 

exports.getCustomerDashboard = async (req, res, next) => {
  try {
    const user = req.user; 

    let defaultAddress = user.addresses?.find(addr => addr.isDefault);
    if (!defaultAddress && user.addresses?.length > 0) {
        defaultAddress = user.addresses[0]; 
    }

    const totalOrders = await Order.countDocuments({ user: user._id });
    const pendingOrders = await Order.countDocuments({ user: user._id, status: "pending" });
    const processingOrders = await Order.countDocuments({ user: user._id, status: "processing" });
    const completedOrders = await Order.countDocuments({ user: user._id, status: "delivered" });

    const recentOrders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 }) 
      .limit(5)
      .select("orderId createdAt status grandTotal");

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        user: {
          name: user.name,
          email: user.email || "",
          phone: user.phone,
          address: defaultAddress ? defaultAddress.fullAddress : "",
          city: defaultAddress ? defaultAddress.city : "",
        },
        stats: {
          totalOrders,
          pending: pendingOrders,
          processing: processingOrders,
          completed: completedOrders,
        },
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 🔥 UPDATE: Pagination added here
exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination math
    const totalOrders = await Order.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit)
      .select("orderId createdAt status paymentStatus paymentMethod grandTotal"); 

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: {
        orders,
        pagination: {
          totalOrders,
          totalPages,
          currentPage: page,
          limit
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserOrderDetails = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await Order.findOne({ user: userId, orderId: orderId });

    if (!order) {
      throw createError(404, "Order not found");
    }

    res.status(200).json({
      success: true,
      message: "Order details fetched successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

exports.retryPayment = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await Order.findOne({ user: userId, orderId: orderId });

    if (!order) {
      throw createError(404, "Order not found");
    }

    if (order.paymentStatus === "paid") {
      throw createError(400, "This order is already paid.");
    }
    if (order.paymentMethod === "cod") {
      throw createError(400, "Cash on Delivery orders do not require online payment.");
    }

    const paymentUrl = await paymentController.initiatePayment(order);

    res.status(200).json({
      success: true,
      message: "Payment initiated successfully",
      data: { paymentUrl }
    });
  } catch (error) {
    next(error);
  }
};



// ১. ইউজারের উইশলিস্ট ডাটা আনা
exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // User মডেল থেকে উইশলিস্ট পপুলেট করে আনা হচ্ছে (শুধুমাত্র দরকারি ফিল্ডগুলো)
    const user = await User.findById(userId).populate({
      path: "wishlist",
      select: "title price image stock hasVariants slug" 
    });

    res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data: user.wishlist || []
    });
  } catch (error) {
    next(error);
  }
};

// ২. উইশলিস্টে প্রোডাক্ট যোগ করা
exports.addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) throw createError(400, "Product ID is required");

    // $addToSet ব্যবহার করা হয়েছে যাতে একই প্রোডাক্ট ডাবল অ্যাড না হয়
    await User.findByIdAndUpdate(userId, {
      $addToSet: { wishlist: productId }
    });

    res.status(200).json({
      success: true,
      message: "Product added to wishlist"
    });
  } catch (error) {
    next(error);
  }
};

// ৩. উইশলিস্ট থেকে প্রোডাক্ট রিমুভ করা
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    // $pull ব্যবহার করে স্পেসিফিক প্রোডাক্ট রিমুভ করা
    await User.findByIdAndUpdate(userId, {
      $pull: { wishlist: productId }
    });

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist"
    });
  } catch (error) {
    next(error);
  }
};

// ৪. পুরো উইশলিস্ট ক্লিয়ার করা
exports.clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // উইশলিস্ট অ্যারে ফাঁকা করে দেওয়া
    await User.findByIdAndUpdate(userId, {
      $set: { wishlist: [] }
    });

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully"
    });
  } catch (error) {
    next(error);
  }
};



// File: controller/userController.js
// ... (আপনার আগের কোডগুলো এখানে থাকবে) ...

// ==========================================
// 👤 PROFILE MANAGEMENT
// ==========================================

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email !== undefined) user.email = email; // ইমেইল ফাঁকাও রাখতে পারে

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      return next(createError(409, "This email is already in use."));
    }
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // পাসওয়ার্ড ফিল্ড ডিফল্টভাবে select: false থাকে, তাই +password দিয়ে আনতে হবে
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw createError(400, "Incorrect current password");
    }

    user.password = newPassword; // Middleware অটোমেটিক হ্যাশ করে নিবে
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 📍 ADDRESS MANAGEMENT
// ==========================================

exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: user.addresses || []
    });
  } catch (error) {
    next(error);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const newAddress = req.body;

    // যদি এটি ইউজারের প্রথম এড্রেস হয়, বা ইউজার নিজে ডিফল্ট সিলেক্ট করে, তবে বাকিগুলো false করতে হবে
    if (newAddress.isDefault || user.addresses.length === 0) {
      newAddress.isDefault = true;
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const updateData = req.body;
    const user = await User.findById(req.user._id);

    const address = user.addresses.id(addressId);
    if (!address) throw createError(404, "Address not found");

    if (updateData.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    address.set(updateData);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    user.addresses.pull(addressId);
    
    // যদি ডিফল্ট এড্রেস ডিলিট হয়, তবে প্রথমটাকে ডিফল্ট করে দাও
    if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
        user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Default address updated",
      data: user.addresses
    });
  } catch (error) {
    next(error);
  }
};