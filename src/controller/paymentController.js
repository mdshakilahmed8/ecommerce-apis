const SSLCommerzPayment = require('sslcommerz-lts');
const PaymentSetting = require("../models/PaymentSetting");
const Order = require("../models/Order");
const createError = require("http-errors");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');



// ======================================================
// 🚀 MASTER INITIATE FUNCTION
// ======================================================
exports.initiatePayment = async (order) => {
    
    let provider = order.paymentMethod.toLowerCase();

    // Map common names to 'sslcommerz'
    if (provider === 'online' || provider === 'sslcommerz') {
        provider = 'sslcommerz';
    }

    const settings = await PaymentSetting.findOne({ provider: provider, isActive: true });
    
    if (!settings) {
        throw createError(400, `Payment Settings for '${provider}' not found or inactive.`);
    }

    // Dynamic Product Info
    const productNames = order.items.map(i => i.name).join(", ").substring(0, 250);
    const productCategory = "Food & Beverage"; 

    switch (provider) {
        case "bkash":
            return await initiateBkashDirect(order, settings);
        case "nagad":
            // Fallback to SSL for Nagad
            return await initiateSSLCommerz(order, settings, productNames, productCategory);
        case "sslcommerz":
            return await initiateSSLCommerz(order, settings, productNames, productCategory);
        default:
            throw createError(400, "Unknown Payment Provider");
    }
};

// ------------------------------------------------------
// 🔹 1. SSL COMMERZ LOGIC (FIXED: Added Shipping Info)
// ------------------------------------------------------
const initiateSSLCommerz = async (order, settings, productNames, category) => {
    
    // Fallback Values if missing
    const customerCity = order.shippingAddress.city || "Dhaka";
    const customerPostCode = order.shippingAddress.zip || "1000";
    const customerEmail = order.shippingAddress.email || "guest@nomail.com";

    const data = {
        total_amount: order.grandTotal,
        currency: 'BDT',
        tran_id: order.orderId,
        success_url: `${process.env.BASE_URL}/api/v1/payments/ssl/success/${order.orderId}`,
        fail_url: `${process.env.BASE_URL}/api/v1/payments/fail/${order.orderId}`,
        cancel_url: `${process.env.BASE_URL}/api/v1/payments/fail/${order.orderId}`,
        ipn_url: `${process.env.BASE_URL}/api/v1/payments/ssl/ipn`,
        
        shipping_method: 'Courier',
        
        product_name: productNames || 'Food Items',
        product_category: category,
        product_profile: 'general',
        
        // ✅ Customer Info
        cus_name: order.shippingAddress.fullName,
        cus_email: customerEmail,
        cus_add1: order.shippingAddress.fullAddress,
        cus_add2: order.shippingAddress.address || "",
        cus_city: customerCity,
        cus_postcode: customerPostCode,
        cus_country: 'Bangladesh',
        cus_phone: order.shippingAddress.phone.number,
        
        // 🔥 FIX: Shipping Info (MANDATORY for SSLCommerz)
        // আমরা শিপিং এড্রেস হিসেবে কাস্টমারের এড্রেসটাই কপি করে দিচ্ছি
        ship_name: order.shippingAddress.fullName,
        ship_add1: order.shippingAddress.fullAddress,
        ship_add2: order.shippingAddress.address || "",
        ship_city: customerCity,
        ship_postcode: customerPostCode,
        ship_country: 'Bangladesh',
    };

    // Sandbox Check
    const isLive = !settings.isSandbox; 
    
    const sslcz = new SSLCommerzPayment(settings.storeId, settings.storePassword, isLive);
    
    try {
        const apiResponse = await sslcz.init(data);

        if (apiResponse?.GatewayPageURL) {
            return apiResponse.GatewayPageURL;
        } else {
            console.error("SSL Error Response:", apiResponse);
            // এখানে নির্দিষ্ট কারণ থাকলে সেটা দেখাবে, নাহলে জেনেরিক মেসেজ
            const reason = apiResponse?.failedreason || "Invalid Store Credentials";
            throw new Error(reason);
        }
    } catch (error) {
        // এই এররটা Order Controller এর catch ব্লকে যাবে
        throw new Error(error.message);
    }
};



// ------------------------------------------------------
// 🔹 2. BKASH DIRECT LOGIC
// ------------------------------------------------------
const initiateBkashDirect = async (order, settings) => {
    const bkashBaseUrl = settings.isSandbox 
        ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" 
        : "https://tokenized.pay.bka.sh/v1.2.0-beta";

    try {
        // A. Grant Token
        const tokenResponse = await axios.post(
            `${bkashBaseUrl}/tokenized/checkout/token/grant`,
            { app_key: settings.storeId, app_secret: settings.storePassword },
            { headers: { username: settings.username, password: settings.password } }
        );
        const idToken = tokenResponse.data.id_token;

        // B. Create Payment
        const paymentResponse = await axios.post(
            `${bkashBaseUrl}/tokenized/checkout/create`,
            {
                mode: "0011",
                payerReference: order.shippingAddress.phone.number,
                callbackURL: `${process.env.BASE_URL}/api/v1/payment/bkash/callback`,
                amount: order.grandTotal,
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: order.orderId
            },
            {
                headers: { Authorization: idToken, "X-APP-Key": settings.storeId }
            }
        );

        // Store Token in Order for Execution Step
        await Order.findByIdAndUpdate(order._id, { 
            "courierSettlement.note": idToken 
        });

        return paymentResponse.data.bkashURL;

    } catch (error) {
        console.error("bKash Error:", error.response?.data || error.message);
        throw createError(500, "bKash Payment Failed to Initialize");
    }
};

// ------------------------------------------------------
// 🔹 3. NAGAD DIRECT LOGIC (Placeholder)
// ------------------------------------------------------
const initiateNagadDirect = async (order, settings) => {
    // Note: Nagad Direct requires a public/private key encryption helper.
    // If you don't have the encryption util, use SSLCommerz for Nagad.
    // Assuming we have a mock URL generation for now:
    
    // Check if storeId exists
    if(!settings.storeId) throw createError(500, "Nagad Merchant ID missing");
    
    // For now, let's fallback to SSLCommerz if Nagad logic is too complex for this file
    // Or return a dummy link if sandbox
    if(settings.isSandbox) {
        // Just for testing flow (In production, use Nagad SDK)
        console.log("Nagad Direct triggered (Sandbox)");
        // throw createError(501, "Direct Nagad requires Encryption Library. Use SSLCommerz instead.");
         const sslSettings = await PaymentSetting.findOne({ provider: "sslcommerz", isActive: true });
         return await initiateSSLCommerz(order, sslSettings);
    }
    
    const sslSettings = await PaymentSetting.findOne({ provider: "sslcommerz", isActive: true });
    return await initiateSSLCommerz(order, sslSettings);
};


// ======================================================
// ✅ CALLBACK HANDLERS
// ======================================================

// 1. SSL Success
exports.sslSuccess = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { val_id } = req.body; 

        const order = await Order.findOne({ orderId });
        if (!order) return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);

        order.paymentStatus = "paid";
        order.status = "confirmed";
        order.courierSettlement.isSettled = true;
        order.courierSettlement.transactionId = val_id;
        order.courierSettlement.note = "Paid via SSLCommerz";
        await order.save();

        res.redirect(`${process.env.FRONTEND_URL}/order-success/${orderId}`);
    } catch (error) { next(error); }
};

// 2. bKash Callback
exports.bkashCallback = async (req, res, next) => {
    try {
        const { paymentID, status } = req.query;

        if (status === 'cancel' || status === 'failure') {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
        }

        // We stored the token in an order, but bKash doesn't return OrderID in callback query params easily.
        // We have to find the order by some logic or use the PaymentID if we saved it.
        // For simplicity: We fetch Settings again.
        
        const settings = await PaymentSetting.findOne({ provider: "bkash", isActive: true });
        
        const bkashBaseUrl = settings.isSandbox 
            ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" 
            : "https://tokenized.pay.bka.sh/v1.2.0-beta";

        // Re-generate token (Safest way without session)
        const tokenResponse = await axios.post(
            `${bkashBaseUrl}/tokenized/checkout/token/grant`,
            { app_key: settings.storeId, app_secret: settings.storePassword },
            { headers: { username: settings.username, password: settings.password } }
        );
        const idToken = tokenResponse.data.id_token;

        // Execute Payment
        const executeRes = await axios.post(
            `${bkashBaseUrl}/tokenized/checkout/execute`,
            { paymentID },
            { headers: { Authorization: idToken, "X-APP-Key": settings.storeId } }
        );

        if (executeRes.data && executeRes.data.statusCode === '0000') {
            const orderId = executeRes.data.merchantInvoiceNumber;
            const order = await Order.findOne({ orderId });

            if(order) {
                order.paymentStatus = "paid";
                order.status = "confirmed";
                order.courierSettlement.isSettled = true;
                order.courierSettlement.transactionId = executeRes.data.trxID;
                order.courierSettlement.note = "Paid via Direct bKash";
                await order.save();
                return res.redirect(`${process.env.FRONTEND_URL}/order-success/${orderId}`);
            }
        } 
        
        return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);

    } catch (error) { next(error); }
};

exports.paymentFail = async (req, res, next) => {
    res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
};