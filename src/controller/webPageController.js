const WebPage = require("../models/WebPage");
const createError = require("http-errors");

// Default Pages for E-commerce
const DEFAULT_PAGES = [
  { title: "About Us", slug: "about-us", content: "<h2>About Our Store</h2><p>Welcome to our store...</p>", isActive: true },
  { title: "Privacy Policy", slug: "privacy-policy", content: "<h2>Privacy Policy</h2><p>Your data is safe...</p>", isActive: true },
  { title: "Terms & Conditions", slug: "terms-conditions", content: "<h2>Terms of Service</h2><p>By using our website...</p>", isActive: true },
  { title: "Refund & Return Policy", slug: "refund-policy", content: "<h2>Return Policy</h2><p>7 days return policy...</p>", isActive: true }
];

// 1. Get All Pages
exports.getAllPages = async (req, res, next) => {
  try {
    let pages = await WebPage.find({}).sort({ createdAt: 1 });
    
    // DB empty thakle default pages insert korbe
    if (pages.length === 0) {
      pages = await WebPage.insertMany(DEFAULT_PAGES);
    }

    res.status(200).json({ success: true, data: pages });
  } catch (error) { 
    next(error); 
  }
};

// 2. Update a Page
exports.updatePage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, isActive } = req.body;

    const page = await WebPage.findById(id);
    if (!page) {
      throw createError(404, "Page not found");
    }

    if (title !== undefined) page.title = title;
    if (content !== undefined) page.content = content;
    if (isActive !== undefined) page.isActive = isActive;

    await page.save();

    res.status(200).json({ 
        success: true, 
        message: `${page.title} updated successfully`, 
        data: page 
    });
  } catch (error) { 
      next(error); 
  }
};

// ৩. Create New Page (Dynamic)
exports.createPage = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) throw createError(400, "Title is required");

    // Title থেকে Slug তৈরি করা (e.g. "Size Guide" -> "size-guide")
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const newPage = await WebPage.create({ title, slug, content: "" });

    res.status(201).json({ success: true, message: "Page created successfully", data: newPage });
  } catch (error) {
    if (error.code === 11000) return next(createError(400, "A page with this name already exists."));
    next(error);
  }
};

// ৪. Delete Page
exports.deletePage = async (req, res, next) => {
  try {
    const page = await WebPage.findByIdAndDelete(req.params.id);
    if (!page) throw createError(404, "Page not found");

    res.status(200).json({ success: true, message: "Page deleted successfully" });
  } catch (error) {
    next(error);
  }
};