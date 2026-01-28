const express = require("express");
const router = express.Router();
const authRouter = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");

router.use("/auth",authRouter);
router.use("/roles", roleRoutes);
    

module.exports = router;


