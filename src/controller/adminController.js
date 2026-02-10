const User = require("../models/User");
const Role = require("../models/Role");

// 1. Create New Admin/Staff
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone, countryCode, roleId, status } = req.body;

    // ১. ইমেইল ডুপ্লিকেট চেক
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // ২. ফোন নাম্বার ডুপ্লিকেট চেক (আপনার স্কিমা অনুযায়ী)
    const phoneExists = await User.findOne({ 
        "phone.number": phone, 
        "phone.countryCode": countryCode || "880" 
    });
    
    if (phoneExists) {
      return res.status(400).json({ success: false, message: "Phone number already exists" });
    }

    // ৩. নতুন ইউজার তৈরি
    const user = await User.create({
      name,
      email,
      password, // Model এর pre-save হুক অটোমেটিক হ্যাশ করবে
      phone: {
        countryCode: countryCode || "880",
        number: phone
      },
      role: roleId,
      status: status || "active",
      
      // যেহেতু এডমিন প্যানেল থেকে বানাচ্ছেন, তাই ভেরিফাইড করে দিচ্ছি
      isEmailVerified: true, 
      isPhoneVerified: true 
    });

    // রেসপন্স ক্লিন করা (পাসওয়ার্ড রিমুভ)
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Admins (Filter out Customers)
exports.getAllAdmins = async (req, res, next) => {
  try {
    // কাস্টমার রোল খুঁজে বের করা
    const customerRole = await Role.findOne({ slug: "customer" });

    const filter = {};
    if (customerRole) {
        // কাস্টমার বাদে বাকি সব রোল (Super Admin, Manager, Editor etc.)
        filter.role = { $ne: customerRole._id }; 
    }

    const admins = await User.find(filter)
      .select("-password") // পাসওয়ার্ড বাদ দিয়ে
      .populate("role", "name slug permissions") // রোলের বিস্তারিত
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Single Admin by ID
exports.getAdminById = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id)
      .select("-password")
      .populate("role");

    if (!admin) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};

// 4. Update Admin
exports.updateAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, countryCode, roleId, status, password } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // সাধারণ তথ্য আপডেট
    if (name) user.name = name;
    if (email) user.email = email;
    if (status) user.status = status;

    // ফোন আপডেট (Nested Object)
    if (phone) user.phone.number = phone;
    if (countryCode) user.phone.countryCode = countryCode;

    // রোল আপডেট
    if (roleId) user.role = roleId;

    // পাসওয়ার্ড আপডেট (যদি ইউজার নতুন পাসওয়ার্ড দেয়)
    if (password && password.trim().length > 0) {
      user.password = password; // সরাসরি অ্যাসাইন করলে pre-save হুক ট্রিগার হবে
    }

    const updatedUser = await user.save();
    updatedUser.password = undefined;

    res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Admin
exports.deleteAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("role");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // সুপার এডমিন ডিলিট করা যাবে না
    if (user.role && user.role.slug === "super_admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Action Denied! Cannot delete Super Admin account." 
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "Staff member removed successfully",
    });
  } catch (error) {
    next(error);
  }
};