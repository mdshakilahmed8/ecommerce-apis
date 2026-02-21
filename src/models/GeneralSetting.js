const mongoose = require("mongoose");

const generalSettingSchema = new mongoose.Schema(
  {
    // ==========================
    // 1. Basic Information
    // ==========================
    storeName: {
      type: String,
      default: "Goni Food",
      trim: true,
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================
    // 2. Contact Information
    // ==========================
    contactEmail: {
      type: String,
      default: "",
      trim: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    supportPhone: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================
    // 3. Location / Address
    // ==========================
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "Bangladesh",
    },

    // ==========================
    // 4. Branding Assets (URLs)
    // ==========================
    logoUrl: {
      type: String,
      default: "",
    },
    faviconUrl: {
      type: String,
      default: "",
    },

    // ==========================
    // 5. Regional Settings
    // ==========================
    currency: {
      type: String,
      default: "BDT",
    },
    currencySymbol: {
      type: String,
      default: "৳",
    },

    // ==========================
    // 6. Layout Configuration (New)
    // ==========================
    headerVariant: {
      type: String,
      enum: ["classic", "modern"], // শুধু এই দুটি ভ্যালুই একসেপ্ট করবে
      default: "classic",
    },

    // ==========================
    // 7. Dynamic Color Palette (New)
    // ==========================
    colors: {
      // Global Colors (Base Theme)
      primary: {
        type: String,
        default: "#15803d", // Green-700 (Main Brand Color)
      },
      secondary: {
        type: String,
        default: "#166534", // Green-800 (Top Bar / Darker Shade)
      },
      accent: {
        type: String,
        default: "#ef4444", // Red-500 (Sale Badges / Notifications)
      },
      background: {
        type: String,
        default: "#ffffff", // Global Body Background
      },
      text: {
        type: String,
        default: "#374151", // Global Body Text
      },

      // Section Specific Overrides
      headerBg: {
        type: String,
        default: "#ffffff", // Navbar Background
      },
      headerText: {
        type: String,
        default: "#374151", // Navbar Text Color
      },
      footerBg: {
        type: String,
        default: "#111827", // Footer Background (Dark)
      },
      footerText: {
        type: String,
        default: "#ffffff", // Footer Text (Light)
      },
    },
  },
  {
    timestamps: true, // createdAt এবং updatedAt অটোমেটিক তৈরি হবে
  }
);

module.exports = mongoose.model("GeneralSetting", generalSettingSchema);