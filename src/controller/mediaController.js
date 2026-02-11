// 🔥 আপনার আগের তৈরি করা Cloudinary কনফিগারেশনটি রিইউজ করা হলো
const cloudinary = require("../config/cloudinary");

exports.uploadEditorImage = async (req, res, next) => {
  try {
    // SunEditor বাই-ডিফল্ট "file-0" নামে ফাইল পাঠায়
    const file = req.file; 

    if (!file) {
      // SunEditor এরর মেসেজ পড়ার জন্য এই ফরম্যাট এক্সপেক্ট করে
      return res.status(400).json({ errorMessage: "No image file provided." });
    }

    // Convert buffer to Data URI
    const b64 = Buffer.from(file.buffer).toString("base64");
    let dataURI = "data:" + file.mimetype + ";base64," + b64;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "ecommerce_editor_media", // ক্লাউডিনারিতে এই ফোল্ডারে সেভ হবে
    });

    // 🔥 SunEditor EXACTLY এই ফরম্যাটে রেসপন্স চায়, নাহলে এডিটরে ইমেজ শো করবে না
    res.status(200).json({
      errorMessage: "",
      result: [
        {
          url: result.secure_url,
          name: file.originalname,
          size: file.size,
        },
      ],
    });
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    res.status(500).json({ errorMessage: "Failed to upload image to server." });
  }
};