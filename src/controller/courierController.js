const CourierSetting = require("../models/CourierSetting");
const Order = require("../models/Order");
const axios = require("axios");
const createError = require("http-errors");

// Helper
const getSteadfastCredentials = async () => {
  const setting = await CourierSetting.findOne({ provider: "steadfast", isActive: true });
  if (!setting || !setting.apiKey || !setting.secretKey) {
    throw createError(400, "Steadfast Courier is inactive or missing credentials.");
  }
  return setting;
};

// 🔥 1. Steadfast Fraud Check
exports.checkSteadfastFraud = async (req, res, next) => {
  try {
    let { phone } = req.params;
    // Ensure 11 digit format (017...)
    if (phone.startsWith("+88")) phone = phone.slice(3);
    if (phone.startsWith("880")) phone = phone.slice(2);
    if (!phone.startsWith("0")) phone = "0" + phone;

    const settings = await getSteadfastCredentials();
    const baseUrl = settings.baseUrl || "https://portal.packzy.com/api/v1";

    console.log(`Checking fraud for phone: ${phone} using Steadfast API...`);

    const response = await axios.get(`${baseUrl}/fraud_check/${phone}`, {
      headers: {
        "Api-Key": settings.apiKey,
        "Secret-Key": settings.secretKey,
        "Content-Type": "application/json"
      }
    });
    console.log("Steadfast Fraud Check Response:", response);

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    next(createError(500, "Fraud Check Failed: " + (error.response?.data?.message || error.message)));
  }
};

// 🔥 2. Push to Steadfast (Looping Single Order API)
exports.pushToSteadfast = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !orderIds.length) throw createError(400, "No orders selected");

    const settings = await getSteadfastCredentials();
    const baseUrl = settings.baseUrl || "https://portal.packzy.com/api/v1";

    const orders = await Order.find({ _id: { $in: orderIds } }).populate("items.product");

    const results = [];
    let successCount = 0;

    // 🔥 Process each order individually using Promise.all for speed
    await Promise.all(orders.map(async (order) => {
      try {
        // Prepare Data for Single Order API
        let pNumber = order.shippingAddress.phone.number || "";
        // Ensure 11 digits (017...)
        if (pNumber.startsWith("880")) pNumber = pNumber.slice(2); // Remove 88
        if (pNumber.startsWith("+880")) pNumber = pNumber.slice(3); // Remove +88
        if (!pNumber.startsWith("0")) pNumber = "0" + pNumber; // Ensure leading 0

        const payload = {
          invoice: order.orderId,
          recipient_name: order.shippingAddress.fullName || "Guest",
          recipient_address: `${order.shippingAddress.fullAddress}`,
          recipient_phone: pNumber, 
          cod_amount: order.paymentMethod === "cod" ? order.grandTotal : 0,
          note: `Items: ${order.items.length}`
        };

        // Call Single API Endpoint
        const response = await axios.post(`${baseUrl}/create_order`, payload, {
          headers: {
            "Api-Key": settings.apiKey,
            "Secret-Key": settings.secretKey,
            "Content-Type": "application/json"
          }
        });

        // Check Response (Steadfast returns 'consignment' object on success)
        const data = response.data;
        
        if (data.status === 200 && data.consignment && data.consignment.tracking_code) {
          // Update DB
          await Order.findByIdAndUpdate(order._id, {
            "courier.provider": "Steadfast",
            "courier.trackingId": data.consignment.tracking_code,
            "courier.courierId": data.consignment.consignment_id,
            status: "shipped"
          });
          
          successCount++;
          results.push({ orderId: order.orderId, status: "success", tracking: data.consignment.tracking_code });
        } else {
          results.push({ orderId: order.orderId, status: "failed", error: "API Error" });
        }

      } catch (err) {
        console.error(`Failed for ${order.orderId}:`, err.message);
        results.push({ orderId: order.orderId, status: "failed", error: err.message });
      }
    }));

    res.status(200).json({
      success: true,
      message: `Successfully shipped ${successCount} out of ${orders.length} orders.`,
      details: results
    });

  } catch (error) {
    next(createError(500, "Steadfast Push Failed: " + error.message));
  }
};