const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ১. Address কে আলাদা স্কিমা হিসেবে রাখা ভালো (Clean Code)
const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true }, // e.g., "Home", "Office"
  
  fullAddress: { type: String, required: true, trim: true }, // Street info
  
  city: { type: String, required: true, trim: true }, // Shipping charge calculation
  area: { type: String, trim: true }, // Thana/Area for courier mapping
  
  state: { type: String, trim: true }, // Division
  zip: { type: String, trim: true },   // Postal Code
  country: { type: String, default: "Bangladesh", trim: true },

  // ডেলিভারির জন্য আলাদা ফোন নম্বর (অপশনাল)
  contactPhone: { 
    countryCode: { type: String, default: "+880" },
    number: { type: String, trim: true } 
  }, 
  
  isDefault: { type: Boolean, default: false }
}, { _id: true }); // প্রতিটি ঠিকানার আলাদা ID থাকবে, যাতে এডিট/ডিলিট সহজ হয়


// ২. মেইন ইউজার স্কিমা
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Name is required"], 
    trim: true,
    minlength: [3, "Name must be at least 3 characters"]
  },
  
  email: { 
    type: String, 
    lowercase: true, 
    trim: true,
    // ইমেইল ভ্যালিডেশন প্যাটার্ন
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 
      "Please provide a valid email address"
    ],
    // Unique & Sparse: একাধিক ইউজারের ইমেইল 'null' হতে পারবে, কিন্তু ভ্যালু থাকলে ইউনিক হতে হবে
    unique: true, 
    sparse: true 
  },

  phone: {
    countryCode: { type: String, default: "+880" }, 
    number: { type: String, required: true, trim: true } 
  },
  
  password: { 
    type: String, 
    required: [true, "Password is required"], 
    minlength: [6, "Password must be at least 6 characters"],
    select: false // কুয়েরি করলে পাসওয়ার্ড ফিল্ড বাই ডিফল্ট আসবে না
  },

  role: { 
    type: String, 
    enum: ["super_admin", "admin", "vendor", "customer"], 
    default: "customer" 
  },

  avatar: { 
    public_id: { type: String }, // Cloudinary/S3 ব্যবহারের জন্য
    url: { type: String } 
  },

  addresses: [addressSchema], // উপরে বানানো স্কিমা ব্যবহার করা হলো

  // ভেরিফিকেশন এবং সিকিউরিটি
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  
  // পাসওয়ার্ড রিসেট টোকেন (ভবিষ্যতের জন্য)
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  status: { 
    type: String, 
    enum: ["active", "banned", "suspended"], 
    default: "active" 
  },

}, { timestamps: true });


// ৩. ইনডেক্সিং ফিক্স (IMPORTANT)
// শুধু নাম্বারের ওপর ইনডেক্স করলে সমস্যা হতে পারে যদি কান্ট্রি কোড আলাদা হয়।
// তাই (Country Code + Number) মিলে ইউনিক হওয়া উচিত।
userSchema.index({ "phone.countryCode": 1, "phone.number": 1 }, { unique: true });


// ৪. পাসওয়ার্ড হ্যাশিং মিডলওয়্যার 
userSchema.pre("save", async function () { 
  // যদি পাসওয়ার্ড মডিফাই না হয়, তাহলে ফাংশন থেকে বের হয়ে যাবে
  if (!this.isModified("password")) {
    return;
  }
  
  // পাসওয়ার্ড হ্যাশ করা
  this.password = await bcrypt.hash(this.password, 12);
});

// ৫. পাসওয়ার্ড কম্পেয়ার মেথড
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);