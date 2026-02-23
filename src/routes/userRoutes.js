// File: routes/userRoutes.js
const express = require("express");
const router = express.Router();

// মিডলওয়্যার এবং কন্ট্রোলার ইমপোর্ট
const { verifyToken } = require("../middlewares/authMiddleware");
const { 
  getCustomerDashboard,
  getUserOrders, 
  getUserOrderDetails,
  retryPayment,
  getWishlist,           
  addToWishlist,        
  removeFromWishlist,   
  clearWishlist,
  updateProfile, changePassword,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress        
} = require("../controller/userController");

// এই রাউটারের সব এপিআই-তে verifyToken কাজ করবে
router.use(verifyToken);

// Dashboard API -> GET /api/v1/user/dashboard
router.get("/dashboard", getCustomerDashboard);

router.get("/orders", getUserOrders);
router.get("/orders/:orderId", getUserOrderDetails);

router.post("/orders/:orderId/retry-payment", retryPayment);

// 🔥 Wishlist Routes
router.get("/wishlist", getWishlist);
router.post("/wishlist", addToWishlist);
router.delete("/wishlist/clear", clearWishlist);
router.delete("/wishlist/:productId", removeFromWishlist);



// 🔥 Profile Routes
router.put("/profile", updateProfile);
router.put("/profile/password", changePassword);

// 🔥 Address Routes
router.get("/addresses", getAddresses);
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);
router.patch("/addresses/:addressId/default", setDefaultAddress);


module.exports = router;