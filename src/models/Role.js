const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Super Admin", "Customer"
  slug: { type: String, required: true, unique: true }, // e.g., "super_admin"
  
  // Permissions list for frontend/backend checking
  // Example: ['product.create', 'order.view', 'user.ban']
  permissions: [{ type: String }], 
  
  description: String

}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);