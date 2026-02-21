const Category = require("../models/Category");
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

// 1. Create Category
exports.createCategory = async (req, res, next) => {

  try {
    const { name, parentId, order, isFeatured, slug } = req.body;

    // ইমেজ আপলোড (যদি থাকে)
    let imageUrl = null;
    let iconUrl = null;

    // Multer fields ব্যবহার করলে req.files অবজেক্ট আকারে আসবে
    if (req.files?.image) {
      imageUrl = await uploadToCloudinary(req.files.image[0], "categories/images");
    }
    if (req.files?.icon) {
      iconUrl = await uploadToCloudinary(req.files.icon[0], "categories/icons");
    }
    
    const category = new Category({
      name,
      slug: slug || slugify(name, { lower: true, strict: true }),
      parentId: parentId || null, // ফাঁকা স্ট্রিং আসলে null করে দিব
      image: imageUrl,
      icon: iconUrl,
      order: order ? Number(order) : 0,
      isFeatured: isFeatured === "true"
    });

    await category.save(); // Model এর pre-save hook অটোমেটিক level এবং ancestors সেট করবে

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });

  } catch (error) {
    next(error);
  }
};

// 2. Get All Categories (Linear List)
exports.getAllCategories = async (req, res, next) => {
  try {
    // পপুলেট করে প্যারেন্টের নামসহ আনা
    const categories = await Category.find()
      .populate("parentId", "name")
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Category Tree (Nested JSON for Frontend Sidebar/Menu)
exports.getCategoryTree = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ order: 1 }).lean();

    // ম্যাপ তৈরি করা যাতে দ্রুত আইডি দিয়ে ডাটা খুঁজে পাওয়া যায়
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id] = { ...cat, children: [] };
    });

    const treeData = [];

    categories.forEach(cat => {
      // যদি parentId থাকে, তাহলে তাকে তার ম্যাপের প্যারেন্টের children হিসেবে ঢুকিয়ে দাও
      if (cat.parentId && categoryMap[cat.parentId]) {
        categoryMap[cat.parentId].children.push(categoryMap[cat._id]);
      } else {
        // যদি parentId না থাকে (null/empty), তবে সেটি root/main ক্যাটাগরি
        treeData.push(categoryMap[cat._id]);
      }
    });

    res.status(200).json({
      success: true,
      data: treeData
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Category
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, parentId, order, isFeatured, slug } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) throw createError(404, "Category not found");

    // ইমেজ আপডেট লজিক
    if (req.files?.image) {
       // TODO: চাইলে পুরোনো ইমেজ ডিলিট করার লজিক বসাতে পারেন
       category.image = await uploadToCloudinary(req.files.image[0], "categories/images");
    }
    if (req.files?.icon) {
       category.icon = await uploadToCloudinary(req.files.icon[0], "categories/icons");
    }

    if (name) category.name = name;
    if (order) category.order = Number(order);
    if (isFeatured) category.isFeatured = isFeatured === "true";
    if (slug) category.slug = slug;
    
    // প্যারেন্ট চেঞ্জ হলে অনেক কিছু আপডেট করতে হয় (Ancestors), তাই save() মেথড কল করতে হবে
    if (parentId !== undefined) {
        category.parentId = parentId === "" ? null : parentId;
    }

    await category.save(); // pre-save hook আবার রান করবে এবং স্ট্রাকচার ঠিক করবে

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Category
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // সেফটি চেক: এর কোনো চাইল্ড ক্যাটাগরি আছে কিনা?
    const hasChildren = await Category.findOne({ parentId: id });
    if (hasChildren) {
      throw createError(400, "Cannot delete this category because it has sub-categories.");
    }

    // সেফটি চেক: এই ক্যাটাগরিতে কোনো প্রোডাক্ট আছে কিনা?
    // const hasProducts = await Product.findOne({ category: id });
    // if (hasProducts) throw createError(400, "Cannot delete category with existing products.");

    const category = await Category.findByIdAndDelete(id);
    
    if (!category) throw createError(404, "Category not found");

    // TODO: Cloudinary থেকে ইমেজ ডিলিট করতে পারেন

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};