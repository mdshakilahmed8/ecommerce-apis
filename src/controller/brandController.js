const Brand = require("../models/Brand");
const createError = require("http-errors");
const cloudinary = require("../config/cloudinary");
const slugify = require("slugify");

// --- Helper: Cloudinary Upload ---
const uploadToCloudinary = async (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
};

// 1. Create Brand
exports.createBrand = async (req, res, next) => {
  try {
    const { name, slug, description, website, status, isFeatured } = req.body;

    // ১. নাম চেক
    if (!name) throw createError(400, "Brand name is required");

    // ২. নামের ডুপ্লিকেট চেক
    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) throw createError(409, "Brand with this name already exists");

    // ৩. কাস্টম স্ল্যাগ লজিক
    let finalSlug = undefined;
    if (slug && slug.trim() !== "") {
        // ইউজার স্ল্যাগ দিলে সেটা ক্লিন করে চেক করি ডুপ্লিকেট আছে কিনা
        const cleanSlug = slugify(slug, { lower: true, strict: true });
        const slugExist = await Brand.findOne({ slug: cleanSlug });
        
        if (slugExist) throw createError(409, "This slug is already taken. Try another.");
        
        finalSlug = cleanSlug;
    } 
    // যদি slug না দেয়, তাহলে undefined থাকবে (Model অটো নাম থেকে বানাবে)

    // ৪. লোগো আপলোড
    let logoUrl = null;
    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file, "brands");
    }

    // ৫. ডাটাবেসে সেভ
    const brand = new Brand({
      name,
      slug: finalSlug, // এখানে logic apply হবে
      description,
      website: website === "null" || website === "" ? null : website,
      logo: logoUrl,
      status: status || "active",
      isFeatured: isFeatured === "true"
    });

    await brand.save();

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand
    });

  } catch (error) {
    next(error);
  }
};

// 2. Get All Brands
exports.getAllBrands = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    
    // ফিল্টার: যদি ?status=active পাঠায়
    if (status) query.status = status;

    const brands = await Brand.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update Brand
exports.updateBrand = async (req, res, next) => {
  try {
    const { name, slug, description, website, status, isFeatured } = req.body;
    const brand = await Brand.findById(req.params.id);

    if (!brand) throw createError(404, "Brand not found");

    // ১. লোগো আপডেট
    if (req.file) {
      brand.logo = await uploadToCloudinary(req.file, "brands");
    }

    // ২. নাম আপডেট এবং স্ল্যাগ হ্যান্ডলিং
    if (name && name !== brand.name) {
         const existing = await Brand.findOne({ name });
         if (existing) throw createError(409, "Brand name already taken");
         
         brand.name = name;
         // নাম পাল্টালে যদি স্ল্যাগ না দেয়, তাহলে স্ল্যাগও নতুন নামের মতো হবে
         if (!slug) {
            brand.slug = slugify(name, { lower: true, strict: true });
         }
    }

    // ৩. স্পেসিফিক স্ল্যাগ আপডেট (ইউজার যদি স্ল্যাগ ফিল্ড এডিট করে)
    if (slug && slug.trim() !== "") {
        const newSlug = slugify(slug, { lower: true, strict: true });
        
        // চেক করি এই স্ল্যাগ অন্য কারো আছে কিনা (নিজেরটা বাদে)
        const slugExist = await Brand.findOne({ slug: newSlug, _id: { $ne: brand._id } });
        if (slugExist) throw createError(409, "Slug already taken");
        
        brand.slug = newSlug;
    }

    // ৪. বাকি ফিল্ড আপডেট
    if (description) brand.description = description;
    if (website) brand.website = website;
    if (status) brand.status = status;
    if (isFeatured) brand.isFeatured = isFeatured === "true";

    await brand.save();

    res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Brand
exports.deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) throw createError(404, "Brand not found");
    
    // TODO: Cloudinary থেকে ইমেজ ডিলিট করার কোড বসাতে পারেন

    res.status(200).json({
      success: true,
      message: "Brand deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};