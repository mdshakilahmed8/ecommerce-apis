const mongoose = require("mongoose");

const heroSliderSchema = new mongoose.Schema({
  image: { 
    type: String, 
    required: [true, "Slider image is required"] 
  },
  title: { 
    type: String, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  buttonText: { 
    type: String, 
    default: "Shop Now" 
  },
  buttonLink: { 
    type: String, 
    default: "/products" 
  },
  position: { 
    type: String, 
    enum: ["left", "center", "right"], 
    default: "center" 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("HeroSlider", heroSliderSchema);