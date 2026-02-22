// File: controllers/paymentController.js

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
// 🔹 1. SSL COMMERZ LOGIC 
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
        
        // Customer Info
        cus_name: order.shippingAddress.fullName,
        cus_email: customerEmail,
        cus_add1: order.shippingAddress.fullAddress,
        cus_add2: order.shippingAddress.address || "",
        cus_city: customerCity,
        cus_postcode: customerPostCode,
        cus_country: 'Bangladesh',
        cus_phone: order.shippingAddress.phone.number,
        
        // Shipping Info (MANDATORY for SSLCommerz)
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
            const reason = apiResponse?.failedreason || "Invalid Store Credentials";
            throw new Error(reason);
        }
    } catch (error) {
        throw new Error(error.message);
    }
};

// ------------------------------------------------------
// 🔹 2. BKASH DIRECT LOGIC (🔥 UPDATED for Failure Tracking)
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
                callbackURL: `${process.env.BASE_URL}/api/v1/payments/bkash/callback`, 
                amount: order.grandTotal,
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: order.orderId
            },
            {
                headers: { Authorization: idToken, "X-APP-Key": settings.storeId }
            }
        );

        // 🔥 FIX: paymentID ডাটাবেসে সেভ করে রাখছি যাতে ফেইল হলে অর্ডার খুঁজে বের করতে পারি
        await Order.findByIdAndUpdate(order._id, { 
            "courierSettlement.note": idToken,
            "courierSettlement.transactionId": paymentResponse.data.paymentID 
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
    if(!settings.storeId) throw createError(500, "Nagad Merchant ID missing");
    
    if(settings.isSandbox) {
        console.log("Nagad Direct triggered (Sandbox)");
         const sslSettings = await PaymentSetting.findOne({ provider: "sslcommerz", isActive: true });
         return await initiateSSLCommerz(order, sslSettings);
    }
    
    const sslSettings = await PaymentSetting.findOne({ provider: "sslcommerz", isActive: true });
    return await initiateSSLCommerz(order, sslSettings);
};


// ======================================================
// ✅ CALLBACK HANDLERS (UPDATED)
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
        
        order.timeline.push({ 
            status: "confirmed", 
            date: new Date(), 
            note: "Payment successful via SSLCommerz" 
        });

        await order.save();

        res.redirect(`${process.env.FRONTEND_URL}/order-success/${orderId}`);
    } catch (error) { next(error); }
};

// 2. bKash Callback (🔥 UPDATED)
exports.bkashCallback = async (req, res, next) => {
    try {
        const { paymentID, status } = req.query;

        // 🔥 FIX: ইনিশিয়েট করার সময় যে paymentID সেভ করেছিলাম, তা দিয়ে অর্ডার খুঁজে বের করা
        const order = await Order.findOne({ "courierSettlement.transactionId": paymentID });

        // ১. যদি ইউজার bKash পেজ থেকে Cancel করে দেয় বা ফেইল হয়
        if (status === 'cancel' || status === 'failure') {
            if (order) {
                order.paymentStatus = "failed";
                order.timeline.push({ 
                    status: order.status, 
                    date: new Date(), 
                    note: `bKash Payment ${status === 'cancel' ? 'Cancelled by User' : 'Failed'}.` 
                });
                await order.save();
            }
            return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
        }

        const settings = await PaymentSetting.findOne({ provider: "bkash", isActive: true });
        
        const bkashBaseUrl = settings.isSandbox 
            ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" 
            : "https://tokenized.pay.bka.sh/v1.2.0-beta";

        // Re-generate token
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

        // ২. যদি এক্সিকিউট সাকসেস হয়
        if (executeRes.data && executeRes.data.statusCode === '0000') {
            if(order) {
                order.paymentStatus = "paid";
                order.status = "confirmed";
                order.courierSettlement.isSettled = true;
                order.courierSettlement.transactionId = executeRes.data.trxID; // Real TrxID
                order.courierSettlement.note = "Paid via Direct bKash";
                
                order.timeline.push({ 
                    status: "confirmed", 
                    date: new Date(), 
                    note: "Payment successful via bKash" 
                });

                await order.save();
                return res.redirect(`${process.env.FRONTEND_URL}/order-success/${order.orderId}`);
            }
        } 
        // ৩. যদি পিন ভুল বা অন্য কারণে এক্সিকিউট ফেইল হয়
        else if (executeRes.data) {
            if (order) {
                order.paymentStatus = "failed";
                order.timeline.push({ 
                    status: order.status, 
                    date: new Date(), 
                    note: `bKash Payment Failed. Reason: ${executeRes.data.statusMessage || 'Unknown'}` 
                });
                await order.save();
            }
        }
        
        return res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);

    } catch (error) { next(error); }
};

// 3. Common Fail / Cancel Callback (🔥 UPDATED)
exports.paymentFail = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        if (orderId) {
            const order = await Order.findOne({ orderId });
            
            if (order) {
                order.paymentStatus = "failed";
                order.timeline.push({ 
                    status: order.status, 
                    date: new Date(), 
                    note: "Payment Gateway reported failure or user cancelled the payment." 
                });

                await order.save();
            }
        }

        res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
    } catch (error) {
        console.error("Payment Fail Update Error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/payment/fail`);
    }
};