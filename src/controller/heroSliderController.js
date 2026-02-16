const HeroSlider = require("../models/HeroSlider");

// 1. Create Slide
exports.createSlide = async (req, res, next) => {
  try {
    const slide = await HeroSlider.create(req.body);
    res.status(201).json({ success: true, message: "Slide created successfully", data: slide });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Slides (Admin - All, Public - Only Active)
exports.getAllSlides = async (req, res, next) => {
  try {
    const { isAdmin } = req.query;
    const query = isAdmin === "true" ? {} : { isActive: true };
    
    // Sort by 'order' (ascending) then 'createdAt' (descending)
    const slides = await HeroSlider.find(query).sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

// 3. Update Slide
exports.updateSlide = async (req, res, next) => {
  try {
    const slide = await HeroSlider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slide) return res.status(404).json({ success: false, message: "Slide not found" });
    res.status(200).json({ success: true, message: "Slide updated", data: slide });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Slide
exports.deleteSlide = async (req, res, next) => {
  try {
    const slide = await HeroSlider.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ success: false, message: "Slide not found" });
    res.status(200).json({ success: true, message: "Slide deleted successfully" });
  } catch (error) {
    next(error);
  }
};