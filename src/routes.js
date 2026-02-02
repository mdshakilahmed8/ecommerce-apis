const express = require("express");
const router = express.Router();
const authRouter = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

router.use("/auth",authRouter);
router.use("/roles", roleRoutes);
router.use("/categories", categoryRoutes);

module.exports = router;


