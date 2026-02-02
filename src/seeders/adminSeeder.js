const User = require("../models/User");
const Role = require("../models/Role");
const bcrypt = require("bcryptjs");
const { passwordSalt } = require("../secret");

const seedSuperAdmin = async () => {
  try {
    // ১. প্রথমে দেখি 'super_admin' রোল আছে কিনা
    let superAdminRole = await Role.findOne({ slug: "super_admin" });

    // যদি roleSeeder আগে রান না করে থাকে, তবে এখানে সেফটি হিসেবে রোল বানিয়ে নিচ্ছি
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "Super Admin",
        slug: "super_admin",
        description: "God mode access. Cannot be deleted.",
        type: "system",
        permissions: ["all_access"],
        isEditable: false, 
      });
      console.log("✅ Super Admin Role Created (Fallback)!");
    }

    // ২. এডমিন ডাটা
    const adminData = {
        email: "admin@barakahit.com",
        phone: {
            countryCode: "+880",
            number: "1700000000"
        }
    };

    // ৩. চেক করি এই ইমেইল বা নাম্বারে ইউজার আছে কিনা
    const existingAdmin = await User.findOne({
        $or: [
            { email: adminData.email },
            { "phone.countryCode": adminData.phone.countryCode, "phone.number": adminData.phone.number }
        ]
    });

    if (!existingAdmin) {

      await User.create({
        name: "System Owner",
        email: adminData.email,
        phone: adminData.phone,
        password: "@Admin123",        
        role: superAdminRole._id,
        
        // --- Single Vendor & Auth Fixes ---
        isPhoneVerified: true, // কাস্টমার হিসেবে লগইন করতে চাইলে
        isEmailVerified: true, // এডমিন হিসেবে লগইন করতে চাইলে (Must True)
        
        status: "active"
      });
      console.log("✅ Super Admin User Created Successfully!");
    } else {
      console.log("ℹ️ Super Admin already exists.");
    }

  } catch (error) {
    console.error("❌ Super Admin Seeding Failed:", error);
  }
};

module.exports = seedSuperAdmin;