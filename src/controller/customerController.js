const User = require("../models/User");
const Role = require("../models/Role");
const createError = require("http-errors"); // যদি ব্যবহার করেন, নাহলে সাধারণ res.status...

// 1. Create New Customer (Admin Panel থেকে)
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, countryCode = "880", password, status, address } = req.body;

    // ১. ফোন নাম্বার ডুপ্লিকেট চেক
    const phoneExists = await User.findOne({ 
        "phone.number": phone, 
        "phone.countryCode": countryCode 
    });
    
    if (phoneExists) {
      return res.status(400).json({ success: false, message: "Phone number already exists." });
    }

    // ২. ইমেইল ডুপ্লিকেট চেক (যদি ইমেইল দেওয়া হয়)
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: "Email already exists." });
      }
    }

    // ৩. কাস্টমার রোল খুঁজে বের করা
    const customerRole = await Role.findOne({ slug: "customer" });
    if (!customerRole) {
      return res.status(500).json({ success: false, message: "System Error: Default 'customer' role not found." });
    }

    // ৪. নতুন কাস্টমার তৈরি
    const user = new User({
      name,
      email: email || undefined, // ফাঁকা স্ট্রিং এড়াতে
      password, // Model অটোমেটিক হ্যাশ করবে
      phone: {
        countryCode,
        number: phone
      },
      role: customerRole._id, // অটোমেটিক কাস্টমার রোল
      status: status || "active",
      
      // এডমিন বানাচ্ছে তাই ভেরিফাইড
      isPhoneVerified: true,
      
      // যদি এড্রেস দেওয়া থাকে
      addresses: address ? [address] : []
    });

    await user.save();

    // রেসপন্স ক্লিন করা
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Customers (Filter ONLY Customers)
exports.getAllCustomers = async (req, res, next) => {
  try {
    // ১. কাস্টমার রোল আইডি বের করা
    const customerRole = await Role.findOne({ slug: "customer" });
    
    if (!customerRole) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // ২. শুধু কাস্টমার রোলের ইউজারদের খোঁজা
    const customers = await User.find({ role: customerRole._id })
      .select("-password") 
      .populate("role", "name slug") // রোলের নাম ও স্লাগ
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Single Customer by ID
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id)
      .select("-password")
      .populate("role");

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // চেক করা যে এটা আসলেই কাস্টমার কিনা (অপশনাল সিকিউরিটি)
    if (customer.role && customer.role.slug !== "customer") {
       // আপনি চাইলে এখানে 404 বা 403 দিতে পারেন, অথবা এডমিন সব দেখতে পারবে তাই বাদ দিতে পারেন
       // return res.status(404).json({ success: false, message: "User is not a customer" });
    }

    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// 4. Update Customer (Admin Panel থেকে)
exports.updateCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, countryCode, status, password, isPhoneVerified } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // সাধারণ তথ্য আপডেট
    if (name) user.name = name;
    if (email) user.email = email;
    if (status) user.status = status; // active / banned
    if (typeof isPhoneVerified === 'boolean') user.isPhoneVerified = isPhoneVerified;

    // ফোন আপডেট (Nested Object)
    if (phone) user.phone.number = phone;
    if (countryCode) user.phone.countryCode = countryCode;

    // পাসওয়ার্ড আপডেট (যদি এডমিন রিসেট করে দেয়)
    if (password && password.trim().length > 0) {
      user.password = password; 
    }

    // নোট: কাস্টমার আপডেটে সাধারণত রোল চেঞ্জ করা হয় না, তাই roleId আপডেট লজিক বাদ রাখা হলো।
    // তবে চাইলে এড করতে পারেন।

    await user.save();
    
    // পাসওয়ার্ড সরানো
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: user,
    });
  } catch (error) {
    // ডুপ্লিকেট ফোন/ইমেইল এরর হ্যান্ডলিং
    if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "Phone or Email already in use." });
    }
    next(error);
  }
};

// 5. Delete Customer
exports.deleteCustomer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("role");

    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // সেফটি চেক: ভুল করে এডমিন ডিলিট যাতে না হয়
    if (user.role && user.role.slug !== "customer") {
        return res.status(403).json({ 
            success: false, 
            message: "Action Denied! This user is not a customer. Use Admin Management." 
        });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "Customer removed successfully",
    });
  } catch (error) {
    next(error);
  }
};



