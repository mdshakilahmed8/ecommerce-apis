const mongoose = require("mongoose");

const connectToDatabase = async () => {
  try {
    // Mongoose v7/v8 এ strictQuery ওয়ার্নিং এড়াতে এটা দেওয়া ভালো (অপশনাল)
    mongoose.set("strictQuery", false);

    console.log(process.env.MONGO_DB_URL);
    const conn = await mongoose.connect(process.env.MONGO_DB_URL);

    console.log(`Database Connected`);
  } catch (err) {
    console.error(`Error connecting to the database: ${err.message}`);

    // কানেকশন ফেইল করলে অ্যাপ বন্ধ করে দেওয়া উচিত, যাতে প্রসেস হ্যাং না হয়
    process.exit(1);
  }
};

module.exports = {
  connectToDatabase,
};
