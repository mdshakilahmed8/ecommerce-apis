const Product = require("../models/Product");
const Category = require("../models/Category"); 
const Brand = require("../models/Brand");
const cloudinary = require("../config/cloudinary");
const createError = require("http-errors");
const slugify = require("slugify");

// --- CREATE PRODUCT ---
exports.createProduct = async (req, res, next) => {
  try {
    // ১. ফর্ম ডাটা থেকে তথ্য নেওয়া
    let { 
      title, description, price, discountPrice, stock, 
      category, brand, tags, hasVariants, variants 
    } = req.body;

    // ২. ইমেজ আপলোড লজিক (Cloudinary)
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          uploadStream.end(file.buffer);
        });
      });
      imageUrls = await Promise.all(uploadPromises);
    }

    // ৩. ভেরিয়েন্ট প্রসেসিং (Form Data তে অ্যারে স্ট্রিং হিসেবে আসে)
    let parsedVariants = [];
    if (hasVariants === "true" || hasVariants === true) {
      if (variants) {
        // ফ্রন্টএন্ড থেকে variants আসবে JSON.stringify() করে
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      }
    }

    // ৪. ক্যাটাগরি এবং ব্র্যান্ড ভ্যালিডেশন (Optional but Good)
    const categoryExists = await Category.findById(category);
    if (!categoryExists) throw createError(404, "Category not found");

    // ৫. স্লাগ তৈরি (মডেলেও আছে, এখানেও রাখা সেফ)
    const slug = slugify(title, { lower: true, strict: true }) + "-" + Date.now();

    // ৬. ডাটাবেসে সেভ করার জন্য অবজেক্ট তৈরি
    const productData = {
      title,
      slug,
      description,
      price: Number(price), // স্ট্রিং থেকে নাম্বার
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      category,
      brand: brand || undefined,
      tags: tags ? (typeof tags === 'string' ? tags.split(',') : tags) : [], // comma separated tags
      
      images: imageUrls,
      
      // ইনভেন্টরি লজিক
      hasVariants: hasVariants === "true" || hasVariants === true,
      stock: hasVariants === "true" ? 0 : Number(stock), // ভেরিয়েন্ট থাকলে মেইন স্টক ০ রাখা ভালো
      variants: parsedVariants
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });

  } catch (error) {
    next(error);
  }
};