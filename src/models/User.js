const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Address Schema
const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true }, // e.g. "Home"
  fullName: { type: String, required: true },
  
  // Address এর ফোন নম্বর
  phone: { 
    countryCode: { type: String, default: "+880" },
    number: { type: String, required: true, trim: true }
  },
  
  fullAddress: { type: String, required: true }, 
  city: { type: String, required: true },
  area: { type: String },
  zip: { type: String },
  
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  
  email: { 
    type: String, 
    lowercase: true, 
    trim: true, 
    unique: true, 
    sparse: true 
  },
  
  // --- INTERNATIONAL PHONE STRUCTURE ---
  phone: { 
    countryCode: { type: String, default: "+880", required: true }, 
    number: { type: String, required: true, trim: true } 
  },

  password: { type: String, required: true, select: false },

  role: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Role",
    required: true 
  },

  avatar: String,
  addresses: [addressSchema],
  
  isVerified: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "banned"], default: "active" }

}, { timestamps: true });

// --- INDEXING FIX ---
// কান্ট্রি কোড + নম্বর মিলে ইউনিক হতে হবে
// যাতে +88017... এবং +117... আলাদা হিসেবে গণ্য হয় কিন্তু সেইম নম্বর দুইবার না আসে।
userSchema.index({ "phone.countryCode": 1, "phone.number": 1 }, { unique: true });

// Password Hash
userSchema.pre("save", async function () { 
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);