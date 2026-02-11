const express = require("express");
const router = express.Router();
const authRouter = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const brandRoutes = require("./routes/brandRoutes");
const productRoutes = require("./routes/productRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const abandonedRoutes = require("./routes/abandonedRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const customerRoutes = require("./routes/customerRoutes");
const smsGatewayRoutes = require("./routes/smsGatewayRoutes");
const marketingRoutes = require("./routes/marketingRoutes");
const courierSettingRoutes = require("./routes/courierSettingRoutes");
const shippingSettingRoutes = require("./routes/shippingSettingRoutes");

router.use("/auth",authRouter);
router.use("/roles", roleRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/abandoned", abandonedRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/admins", adminRoutes);
router.use("/customers", customerRoutes);
router.use("/sms-gateways", smsGatewayRoutes);
router.use("/marketing", marketingRoutes);
router.use("/courier-settings", courierSettingRoutes);
router.use("/shipping-settings", shippingSettingRoutes);


module.exports = router;


