const express = require("express");
const router = express.Router();
const authRouter = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const brandRoutes = require("./routes/brandRoutes");
const productRoutes = require("./routes/productRoutes");

router.use("/auth",authRouter);
router.use("/roles", roleRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/products", productRoutes);


module.exports = router;


