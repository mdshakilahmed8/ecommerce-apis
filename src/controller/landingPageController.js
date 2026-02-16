const LandingPage = require("../models/LandingPage");

// 1. Create or Update Landing Page (Upsert)
exports.saveLandingPage = async (req, res, next) => {
  try {
    const { _id, slug, ...data } = req.body;

    // Check if Slug is Unique (excluding current doc if updating)
    const existing = await LandingPage.findOne({ slug });
    if (existing && (!_id || existing._id.toString() !== _id)) {
      return res.status(400).json({ 
        success: false, 
        message: "This URL slug is already taken! Please choose another." 
      });
    }

    let page;
    if (_id) {
      // Update Existing Campaign
      page = await LandingPage.findByIdAndUpdate(
        _id, 
        { slug, ...data }, 
        { new: true, runValidators: true }
      );
      if (!page) return res.status(404).json({ success: false, message: "Landing page not found to update" });
    } else {
      // Create New Campaign
      page = await LandingPage.create({ slug, ...data });
    }

    res.status(200).json({ 
      success: true, 
      message: _id ? "Campaign updated successfully" : "Campaign created successfully", 
      data: page 
    });

  } catch (error) {
    next(error);
  }
};

// 2. Get Public Page Data (By Slug)
exports.getLandingPagePublic = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // 🔥 Deep Populate: Updated path based on your new model structure
    // Path: 'products.productList.product'
    const page = await LandingPage.findOne({ slug })
      .populate({
        path: "products.productList.product",
        select: "title images price discountPrice stock sku" // Only fetch needed fields
      });

    if (!page) {
        return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    
    // Check if active (Optional: Admins might want to preview inactive pages via a different route)
    if (!page.isActive) {
        return res.status(404).json({ success: false, message: "This campaign is currently inactive" });
    }
    
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

// 3. Get All Landing Pages (For Admin List)
exports.getAllLandingPages = async (req, res, next) => {
  try {
    const pages = await LandingPage.find()
      .select("title slug isActive products createdAt updatedAt") 
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: pages });
  } catch (error) {
    next(error);
  }
};

// 4. Get Single Page for Admin Edit (By Slug or ID)
exports.getLandingPageAdmin = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // Admin needs full details to edit
    const page = await LandingPage.findOne({ slug })
        .populate({
            path: "products.productList.product",
            select: "title images price stock" // Basic info for the picker preview
        });

    if (!page) {
        return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Landing Page
exports.deleteLandingPage = async (req, res, next) => {
  try {
    const page = await LandingPage.findByIdAndDelete(req.params.id);
    
    if (!page) {
        return res.status(404).json({ success: false, message: "Page not found" });
    }

    res.status(200).json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    next(error);
  }
};