const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Address Schema
const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true }, 
  fullName: { type: String, required: true },
  
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
  
  // Admin Login (Email is Primary)
  email: { 
    type: String, 
    lowercase: true, 
    trim: true, 
    unique: true, 
    sparse: true 
  },
  
  // Customer Login (Phone is Primary)
  phone: { 
    countryCode: { type: String, default: "+880", required: true }, 
    number: { type: String, required: true, trim: true } 
  },

  password: { type: String, required: true, select: false },

  // Role Reference
  role: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Role",
    required: true 
  },

  avatar: String,
  addresses: [addressSchema],
  
  // --- IMPORTANT UPDATE FOR AUTH CONTROLLER ---
  // আপনার কন্ট্রোলারের লজিক অনুযায়ী এই দুটি ফিল্ড মাস্ট লাগবে
  isPhoneVerified: { type: Boolean, default: false }, // Customer এর জন্য
  isEmailVerified: { type: Boolean, default: false }, // Admin এর জন্য
  
  status: { type: String, enum: ["active", "banned"], default: "active" }

}, { timestamps: true });

// Indexing for fast search
userSchema.index({ "phone.countryCode": 1, "phone.number": 1 }, { unique: true });

// Password Hash Middleware
userSchema.pre("save", async function () { 
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare Password Method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);