const PERMISSIONS = [
  // Dashboard
  { label: "Dashboard View", value: "dashboard.view" },

  // Products
  { label: "View Products", value: "product.view" },
  { label: "Create Product", value: "product.create" },
  { label: "Edit Product", value: "product.edit" },
  { label: "Delete Product", value: "product.delete" },

  // Orders
  { label: "View Orders", value: "order.view" },
  { label: "Manage Orders", value: "order.manage" },

  // Users
  { label: "View Users", value: "user.view" },
  { label: "Manage Roles", value: "role.manage" },

  // Settings
  { label: "Manage Settings", value: "settings.manage" }
];

module.exports = PERMISSIONS;