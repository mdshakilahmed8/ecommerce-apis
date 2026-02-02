const multer = require("multer");

const storage = multer.memoryStorage(); // ডিস্কে সেভ না করে মেমোরিতে রাখব

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // সর্বোচ্চ ৫MB
  fileFilter: fileFilter,
});

module.exports = upload;