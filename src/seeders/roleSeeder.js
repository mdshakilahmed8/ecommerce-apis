const Role = require("../models/Role");

const seedRoles = async () => {
  try {
    const defaultRoles = [
      // ১. কাস্টমার (সাধারণ ইউজার)
      {
        name: "Customer",
        slug: "customer",
        type: "system",
        permissions: [
            "product.view", 
            "order.create", 
            "profile.view", 
            "review.create"
        ],
        description: "Regular user who buys products",
        isEditable: false 
      },
      
      // ২. সুপার এডমিন (মালিক - সব পাওয়ার আছে)
      {
        name: "Super Admin",
        slug: "super_admin",
        type: "system",
        permissions: ["all_access"],
        description: "System Owner & Main Seller",
        isEditable: false
      },

      // ৩. ম্যানেজার / স্টাফ (আপনার কর্মচারী)
      // সিঙ্গেল ভেন্ডর সিস্টেমে ভেন্ডর থাকে না, কিন্তু আপনার হেল্পার লাগতে পারে
      {
        name: "Shop Manager",
        slug: "manager",
        type: "system",
        permissions: [
            "product.create", 
            "product.edit", 
            "product.delete",
            "order.manage",     // অর্ডার প্রসেস করতে পারবে
            "order.view"
        ],
        description: "Staff who manages products and orders but cannot change system settings",
        isEditable: true // আপনি চাইলে পরে এদের পারমিশন এডিট করতে পারবেন
      }
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ slug: roleData.slug });
      
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`✅ Role Created: ${roleData.name}`);
      }
    }
    
    console.log("--- Role Seeding Completed ---");

  } catch (error) {
    console.error("❌ Role Seeding Failed:", error);
  }
};

module.exports = seedRoles;