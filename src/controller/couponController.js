const Coupon = require("../models/Coupon");

// 1. Create Coupon
exports.createCoupon = async (req, res, next) => {
  try {
    const { code, discountType, discountAmount, endDate, ...rest } = req.body;

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupon code already exists!" });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountAmount,
      endDate,
      ...rest
    });

    res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Coupons (Admin)
exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
};

// 3. Update Coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    
    if (!updatedCoupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    res.status(200).json({ success: true, message: "Coupon updated", data: updatedCoupon });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Coupon
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    
    res.status(200).json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// 5. Apply Coupon (Public/Checkout)
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, cartTotal } = req.body;
    
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    // Check Validity
    if (!coupon.isValid()) {
      return res.status(400).json({ success: false, message: "Coupon has expired or usage limit reached" });
    }

    // Check Minimum Order Amount
    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum order amount of ${coupon.minOrderAmount} required for this coupon` 
      });
    }

    // Calculate Discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (cartTotal * coupon.discountAmount) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      discount = coupon.discountAmount;
    }

    // Ensure discount doesn't exceed cart total
    discount = Math.min(discount, cartTotal);

    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      discountAmount: discount,
      couponCode: coupon.code
    });

  } catch (error) {
    next(error);
  }
};