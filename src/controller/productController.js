const Product = require("../models/Product");
const Category = require("../models/Category");
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



// 1. Create Product (With Manual Slug Support)
exports.createProduct = async (req, res, next) => {
  try {
    let { 
        title, slug, shortDescription, description, price, discountPrice, stock, 
        category, brand, tags, hasVariants, variants, isPublished 
    } = req.body;

    // A. Validation
    if (!title || !shortDescription || !description || !price || !category) {
        throw createError(400, "Title, Short Description, Full Description, Price, and Category are required");
    }

    // B. Slug Handling (Manual vs Auto)
    let finalSlug;
    
    // ১. যদি ইউজার ম্যানুয়াল স্ল্যাগ দেয়
    if (slug && slug.trim() !== "" && slug !== "null") {
        finalSlug = slugify(slug, { lower: true, strict: true });
        // ডুপ্লিকেট চেক
        const existingSlug = await Product.findOne({ slug: finalSlug });
        if (existingSlug) {
            throw createError(409, "This slug is already in use. Please choose another.");
        }
    } 
    // ২. যদি স্ল্যাগ না দেয় -> টাইটেল থেকে অটো জেনারেট
    else {
        finalSlug = slugify(title, { lower: true, strict: true });
        const existingProduct = await Product.findOne({ slug: finalSlug });
        if (existingProduct) {
            finalSlug = finalSlug + "-" + Date.now(); // ইউনিকনেস নিশ্চিত করা
        }
    }

    // C. Handle Tags & Variants
    let parsedTags = [];
    let parsedVariants = [];

    if (tags) {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags); 
    }
    if (variants && (hasVariants === "true" || hasVariants === true)) {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    }

    // D. Image Upload
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(file => uploadToCloudinary(file, "products"));
        imageUrls = await Promise.all(uploadPromises);
    }

    const product = new Product({
        title,
        slug: finalSlug, // ✅ আপডেটেড স্ল্যাগ
        shortDescription,
        description,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        category,
        brand: brand || undefined,
        stock: Number(stock) || 0,
        hasVariants: hasVariants === "true",
        variants: parsedVariants,
        tags: parsedTags,
        images: imageUrls,
        isPublished: isPublished === "true"
    });

    await product.save();

    res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product
    });

  } catch (error) {
    next(error);
  }
};

// 2. Get All Products (Advanced Filtering & Pagination)
exports.getAllProducts = async (req, res, next) => {
  try {
    // ১. কুয়েরি প্যারামিটার রিসিভ করা (Default: Page 1, Limit 10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // 🔥 চেঞ্জ ১: req.query থেকে isFeatured রিসিভ করা হলো
    const { keyword, category, brand, priceMin, priceMax, sort, isFeatured } = req.query;

    // ২. ফিল্টারিং অবজেক্ট তৈরি
    let query = { isPublished: true }; 
    
    // 🔥 চেঞ্জ ২: যদি API-তে isFeatured=true পাঠানো হয়, তাহলে কুয়েরিতে সেটা অ্যাড হবে
    if (isFeatured === 'true') {
        query.isFeatured = true;
    }

    // A. সার্চ (টাইটেল, ট্যাগস বা শর্ট ডেসক্রিপশন দিয়ে)
    if (keyword) {
        query.$or = [
            { title: { $regex: keyword, $options: "i" } },
            { shortDescription: { $regex: keyword, $options: "i" } }, 
            { tags: { $in: [new RegExp(keyword, "i")] } }
        ];
    }

    // B. ক্যাটাগরি ফিল্টার
    if (category) query.category = category;
    
    // C. ব্র্যান্ড ফিল্টার
    if (brand) query.brand = brand;

    // D. প্রাইস রেঞ্জ ফিল্টার
    if (priceMin || priceMax) {
        query.price = {};
        if (priceMin) query.price.$gte = Number(priceMin);
        if (priceMax) query.price.$lte = Number(priceMax);
    }

    // ৩. সর্টিং (Sorting)
    let sortOption = { createdAt: -1 }; // Default: Newest first
    
    if (sort === "priceAsc") sortOption = { price: 1 };      // কম দাম থেকে বেশি
    if (sort === "priceDesc") sortOption = { price: -1 };    // বেশি দাম থেকে কম
    if (sort === "oldest") sortOption = { createdAt: 1 };    // পুরাতন আগে
    if (sort === "topSold") sortOption = { sold: -1 };       // বেস্ট সেলিং

    // ৪. পেজিনেশন ক্যালকুলেশন (Skip Logic)
    const skip = (page - 1) * limit;

    // ৫. ডাটাবেস কুয়েরি
    const products = await Product.find(query)
        .populate("category", "name slug") 
        .populate("brand", "name slug logo") 
        .select("-description") 
        .sort(sortOption)
        .skip(skip)
        .limit(limit);

    // ৬. টোটাল কাউন্ট (পেজিনেশনের জন্য জরুরি)
    const totalDocuments = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalDocuments / limit);

    // ৭. রেসপন্স পাঠানো
    res.status(200).json({
        success: true,
        message: "Products fetched successfully",
        meta: {
            totalProducts: totalDocuments,
            totalPages: totalPages,
            currentPage: page,
            productsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        },
        data: products
    });

  } catch (error) {
    next(error);
  }
};
// 3. Get Single Product (By Slug)
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
        .populate("category", "name slug ancestors") // ব্রেডকাম্ব এর জন্য ancestors লাগবে
        .populate("brand", "name logo");

    if (!product) throw createError(404, "Product not found");

    // View Count বাড়ানো
    product.viewCount += 1;
    await product.save();

    res.status(200).json({
        success: true,
        data: product
    });

  } catch (error) {
    next(error);
  }
};


// 4. Update Product (With Manual Slug Support)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw createError(404, "Product not found");

    // ইমেজ হ্যান্ডলিং
    let newImages = product.images; 
    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(file => uploadToCloudinary(file, "products"));
        const uploadedUrls = await Promise.all(uploadPromises);
        newImages = [...newImages, ...uploadedUrls]; 
    }

    // JSON Parsing
    let parsedVariants = product.variants;
    if (req.body.variants) {
        parsedVariants = typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants;
    }
    let parsedTags = product.tags;
    if (req.body.tags) {
        parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
    }

    // ডাটা আপডেট অবজেক্ট তৈরি
    const updateData = {
        ...req.body, 
        images: newImages,
        variants: parsedVariants,
        tags: parsedTags,
        price: req.body.price ? Number(req.body.price) : product.price,
        hasVariants: req.body.hasVariants === "true" || req.body.hasVariants === true
    };
    
    // --- SLUG UPDATE LOGIC ---
    
    // ১. যদি ইউজার স্পেসিফিক স্ল্যাগ দেয়
    if (req.body.slug && req.body.slug.trim() !== "" && req.body.slug !== "null") {
        const newSlug = slugify(req.body.slug, { lower: true, strict: true });
        // অন্য প্রোডাক্টের সাথে কনফ্লিক্ট চেক (নিজেকে বাদ দিয়ে)
        const slugExist = await Product.findOne({ slug: newSlug, _id: { $ne: product._id } });
        if (slugExist) throw createError(409, "Slug already exists. Try another.");
        
        updateData.slug = newSlug;
    }
    // ২. যদি স্ল্যাগ না দেয়, কিন্তু টাইটেল পাল্টায় -> অটো স্ল্যাগ জেনারেট
    else if (req.body.title && req.body.title !== product.title) {
        let tempSlug = slugify(req.body.title, { lower: true, strict: true });
        // ইউনিকনেস চেক
        const existing = await Product.findOne({ slug: tempSlug, _id: { $ne: product._id } });
        if (existing) {
             tempSlug += "-" + Date.now();
        }
        updateData.slug = tempSlug;
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct
    });

  } catch (error) {
    next(error);
  }
};


// 5. Delete Product
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw createError(404, "Product not found");
    
    // TODO: Cloudinary থেকে ইমেজ ডিলিট করার লজিক এখানে যুক্ত করতে পারেন (Optional)

    res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};


// 6. Get Related Products (By Category)
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params; // কারেন্ট প্রোডাক্টের ID

    // কারেন্ট প্রোডাক্টটা বের করা যাতে ক্যাটাগরি পাই
    const product = await Product.findById(id);
    if (!product) throw createError(404, "Product not found");

    // একই ক্যাটাগরির অন্য প্রোডাক্ট খুঁজবো (বর্তমান প্রোডাক্টটা বাদ দিয়ে)
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isPublished: true
    })
    .select("title slug price discountPrice images ratingsAverage stock") // শুধু দরকারি ফিল্ড
    .limit(5) // ম্যাক্সিমাম ৫টা
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: relatedProducts
    });

  } catch (error) {
    next(error);
  }
};


// Advanced Search & Filter API (For Category & Search Pages)
exports.searchAndFilterProducts = async (req, res, next) => {
  try {
    // 1. Extract Query Parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Standard 12 or 16 for grids
    const { keyword, category, brand, minPrice, maxPrice, sort } = req.query;

    // 2. Build Query Object
    let query = { isPublished: true };

    // A. Keyword Search (Global Search)
    if (keyword) {
      // যদি Product Model-এ Text Index করা থাকে, তাহলে $text ব্যবহার করা ভালো
      // অথবা $regex দিয়ে ফিল্টার করা যায় (Partial Match)
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { shortDescription: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } }
      ];
    }

    // B. Category Filter (Supports multiple categories comma separated)
    if (category) {
      const categoryIds = category.split(',');
      query.category = { $in: categoryIds };
    }

    // C. Brand Filter (Supports multiple brands comma separated)
    if (brand) {
      const brandIds = brand.split(',');
      query.brand = { $in: brandIds };
    }

    // D. Price Range Filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 3. Sorting Logic
    let sortOption = { createdAt: -1 }; // Default: Newest first
    
    switch (sort) {
      case "priceAsc": sortOption = { price: 1 }; break;
      case "priceDesc": sortOption = { price: -1 }; break;
      case "topSold": sortOption = { sold: -1 }; break;
      case "ratingDesc": sortOption = { ratingsAverage: -1 }; break;
      case "oldest": sortOption = { createdAt: 1 }; break;
      default: sortOption = { createdAt: -1 }; break;
    }

    // 4. Pagination Logic
    const skip = (page - 1) * limit;

    // 5. Execute DB Query
    const products = await Product.find(query)
      .populate("category", "name slug")
      .populate("brand", "name logo slug")
      .select("-description -variants.attributes") // Exclude heavy text to make API faster
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(); // .lean() makes the query faster as it returns plain JS objects

    // 6. Get Total Count for Pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // 7. Send Response
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      meta: {
        totalProducts,
        totalPages,
        currentPage: page,
        productsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        // Optional: Active filters return করলে ফ্রন্টএন্ডে ডিবাগ করা সহজ হয়
        activeFilters: { keyword, category, brand, minPrice, maxPrice, sort }
      },
      data: products
    });

  } catch (error) {
    next(error);
  }
};