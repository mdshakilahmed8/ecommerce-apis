// models/Role.js
const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Customer Support", "Inventory Manager"
  slug: { type: String, required: true, unique: true }, // e.g., "customer_support"
  description: { type: String },

  // International Standard: Scope definition
  // এই রোলটি কি সিস্টেমের জন্য নাকি দোকানের জন্য?
  type: { 
    type: String, 
    enum: ["system", "shop"], 
    required: true 
  },

  // Granular Permissions (Atomic Design)
  // Example: ['product.create', 'product.edit', 'order.view']
  permissions: [{ type: String }],

  // এই রোলটি কি এডিট/ডিলিট করা যাবে? (Super Admin রোল কেউ ডিলিট করতে পারবে না)
  isEditable: { type: Boolean, default: true },

  // যদি এটি কোনো ভেন্ডরের কাস্টম রোল হয়
  shop: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Shop", 
    default: null 
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" } // কে রোলটি বানাল
}, { timestamps: true });

// দোকানের রোল ইউনিক হতে হবে, আবার সিস্টেমের রোলও ইউনিক হতে হবে
roleSchema.index({ slug: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model("Role", roleSchema);