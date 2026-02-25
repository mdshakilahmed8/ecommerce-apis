const Order = require("../models/Order");
const AbandonedCheckout = require("../models/AbandonedCheckout");
const Product = require("../models/Product");
const User = require("../models/User");
const Role = require("../models/Role");
const Otp = require("../models/Otp");
const PaymentSetting = require("../models/PaymentSetting"); 
const createError = require("http-errors");
const crypto = require("crypto");
const { initiatePayment } = require("./paymentController"); 
const sendSms = require("../utils/smsSender");
const GeneralSetting = require("../models/GeneralSetting");
const { createAdminNotification } = require("../utils/notificationHelper");
const { title } = require("process");
const { mongo, default: mongoose } = require("mongoose");

// ==========================================
// 🛠️ HELPERS
// ==========================================
// Generate Short Unique Alphanumeric ID (e.g., ORD-X7K9P2)
const generateOrderId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${result}`; 
};

const generateRandomPassword = () => crypto.randomBytes(4).toString('hex');
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6 Digit

// // SMS Sender (Placeholder)
// const sendSms = async (to, message) => {
//     console.log(`📨 [SMS to ${to}]: ${message}`);
//     // await axios.post(...) 
// };


// ==================================================================
// ⚙️ INTERNAL SHARED FUNCTION: PLACE ORDER
// ==================================================================
const placeOrderInternal = async (orderData, user, ip, options = { sendOrderSms: true }) => {
    const { items, shippingAddress, paymentMethod, shippingFee, discount, guestId, subTotal, grandTotal } = orderData;

    // ১. ব্র্যান্ডিং-এর জন্য স্টোর নেম নিয়ে আসা
    const settings = await GeneralSetting.findOne();
    const storeName = settings?.storeName || "Our Shop"; // ডিফল্ট নাম যদি সেটিং না থাকে

    // ২. পেমেন্ট মেথড লোয়ারকেস করা
    const pMethod = paymentMethod.toLowerCase();

    // ৩. আইটেম এবং স্টক ক্যালকুলেশন
    let finalOrderItems = [];
    let calculatedSubTotal = 0;

    for (const item of items) {
        const dbProduct = await Product.findById(item.product);
        if (!dbProduct) throw createError(404, `Product not found: ${item.product}`);

        let finalPrice = 0, finalName = dbProduct.title, finalSku = "GEN-SKU";
        let finalImage = dbProduct.images[0] || "";

        // ভেরিয়েন্ট চেক
        if (item.variantId) {
            const variant = dbProduct.variants.find(v => v._id.toString() === item.variantId);
            if (!variant) throw createError(400, `Variant not found for: ${dbProduct.title}`);
            
            // স্টক চেক
            if (variant.stock < item.quantity) {
                throw createError(400, `Stock out: ${dbProduct.title} (Variant)`);
            }

            // স্টক কমানো
            variant.stock -= item.quantity;
            
            // প্রাইস এবং ইমেজ সেট করা
            finalPrice = variant.price;
            if (variant.image) finalImage = variant.image;
            // ভেরিয়েন্ট অ্যাট্রিবিউট টাইটেলের সাথে যুক্ত করা (অপশনাল, রিপোর্টিংয়ের জন্য ভালো)
            // finalName = `${dbProduct.title} - ${Object.values(variant.attributes).join('/')}`;

        } else {
            // সিম্পল প্রোডাক্ট চেক
            if (dbProduct.hasVariants && !item.variantId) {
                throw createError(400, `Please select options for ${dbProduct.title}`);
            }
            if (dbProduct.stock < item.quantity) {
                throw createError(400, `Stock out: ${dbProduct.title}`);
            }

            // স্টক কমানো
            dbProduct.stock -= item.quantity;
            finalPrice = dbProduct.discountPrice || dbProduct.price;
        }

        // সেলস কাউন্ট বাড়ানো
        dbProduct.sold += item.quantity;
        await dbProduct.save();

        // ফাইনাল আইটেম লিস্ট রেডি করা
        finalOrderItems.push({
            product: dbProduct._id,
            variantId: item.variantId,
            name: finalName,
            sku: finalSku,
            image: finalImage,
            price: finalPrice,
            quantity: item.quantity,
            total: finalPrice * item.quantity
        });

        calculatedSubTotal += (finalPrice * item.quantity);
    }

    // ৪. ফাইনান্সিয়াল ক্যালকুলেশন (Backend Validation)
    // ক্লায়েন্ট সাইড থেকে পাঠানো ভ্যালু রি-ভেরিফাই করা ভালো, তবে এখানে আমরা পাঠানো ডাটাই ব্যবহার করছি
    const finalShippingFee = Number(shippingFee) || 0;
    const finalDiscount = Number(discount) || 0;
    
    // গ্র্যান্ড টোটাল আবার ক্যালকুলেট করা হচ্ছে যাতে ফ্রন্টএন্ডে কেউ ম্যানিপুলেট না করে
    // (আপনি চাইলে ফ্রন্টএন্ডের grandTotal-ও রাখতে পারেন, তবে ব্যাকএন্ড ক্যালকুলেশন নিরাপদ)
    const calculatedGrandTotal = (calculatedSubTotal + finalShippingFee) - finalDiscount;

    // ৫. ইউনিক অর্ডার আইডি জেনারেট
    let orderId = generateOrderId();
    while (await Order.findOne({ orderId })) { orderId = generateOrderId(); }

    // ৬. অর্ডার অবজেক্ট তৈরি
    const order = new Order({
        orderId,
        user: user._id,
        ipAddress: ip,
        items: finalOrderItems,
        shippingAddress: {
            ...shippingAddress,
            phone: {
                countryCode: shippingAddress.phone.countryCode || "880",
                number: shippingAddress.phone.number
            }
        },
        paymentMethod: pMethod,
        paymentStatus: orderData.paymentStatus || "pending", // POS হলে 'paid' আসবে
        subTotal: calculatedSubTotal,
        shippingFee: finalShippingFee,
        discount: finalDiscount,
        grandTotal: calculatedGrandTotal,
        status: orderData.status || "pending", // POS হলে 'delivered' আসবে
        
        // লগ এবং টাইমলাইন
        management: { 
            status: "new", 
            logs: [{ action: "Order Placed", date: new Date() }] 
        },
        timeline: [{ 
            status: orderData.status || "pending", 
            updatedBy: user._id, 
            date: new Date(), 
            note: "Order placed successfully" 
        }]
    });

    // ডাটাবেসে সেভ করা
    await order.save();

    // ৭. পেমেন্ট গেটওয়ে এবং SMS লজিক
    let paymentUrl = null;
    const digitalMethods = ["sslcommerz", "bkash", "nagad"];

    if (digitalMethods.includes(pMethod)) {
        try {
            // পেমেন্ট লিংক জেনারেট করা
            paymentUrl = await initiatePayment(order);
        } catch (error) {
            console.error("🔴 Gateway Error:", error.message);
            // পেমেন্ট ইনিশিয়েট না হলে অর্ডার ডিলিট করা হচ্ছে (রোলব্যাক)
            await Order.findByIdAndDelete(order._id);
            throw createError(500, "Payment Gateway Initialization Failed");
        }
    } else {
        // COD বা POS পেমেন্ট
        // 🔥 SMS পাঠানো হবে কিনা তা 'options.sendOrderSms' দিয়ে চেক করা হচ্ছে
        if (options.sendOrderSms) {
            try {
                const fullPhone = `${shippingAddress.phone.countryCode?.replace('+', '')}${shippingAddress.phone.number}`;
                
                // ✅ DYNAMIC BRANDING MESSAGE
                const message = `Dear Customer, Your order #${orderId} has been placed at ${storeName}. Total: ${calculatedGrandTotal} Tk. Thank you!`;
                
                await sendSms(fullPhone, message);
            } catch (smsError) {
                console.error("SMS Failed:", smsError.message);
                // SMS ফেইল হলে অর্ডার আটকাবো না
            }
        }
    }

    // ৮. গেস্ট বা অ্যাবান্ডনড চেকআউট ক্লিয়ার করা
    if (guestId) {
        await AbandonedCheckout.findOneAndDelete({ guestId });
    }

    return { order, paymentUrl };
};


// ==================================================================
// 🎮 CONTROLLER 1: INITIATE ORDER (Step 1)
// ==================================================================
exports.initiateOrder = async (req, res, next) => {
    try {
        const { shippingAddress, paymentMethod } = req.body;
        
        if (!shippingAddress?.phone?.number) throw createError(400, "Phone number required");

        // 🔥 1. Clean Input (Convert to lowercase)
        const cleanMethod = paymentMethod.toLowerCase();

        // 🔥 2. Check if Payment Method is Active (Skip for COD)
        if (cleanMethod !== 'cod') {
            const setting = await PaymentSetting.findOne({ provider: cleanMethod });
            
            // If setting not found or isActive is false
            if (!setting || setting.isActive === false) {
                 throw createError(400, `Payment method '${paymentMethod}' is currently disabled.`);
            }
        }

        const userPhone = shippingAddress.phone.number;
        const countryCode = shippingAddress.phone.countryCode || "880";
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        
        // 3. Check User
        let user = req.user ? await User.findById(req.user._id) : await User.findOne({ "phone.number": userPhone });

        // ---------------------------------------------
        // SCENARIO A: EXISTING USER (Direct Order)
        // ---------------------------------------------
        if (user) {
            const result = await placeOrderInternal(req.body, user, ip);
            return res.status(201).json({
                success: true,
                message: result.paymentUrl ? "Redirecting to payment..." : "Order placed successfully",
                data: result.order,
                paymentUrl: result.paymentUrl,
                requiresVerification: false
            });
        } 
        
        // ---------------------------------------------
        // SCENARIO B: NEW USER
        // ---------------------------------------------
        else {
            const digitalMethods = ["sslcommerz", "bkash", "nagad"];

            // 🔥 CASE 1: DIGITAL PAYMENT (No OTP Needed)
            if (digitalMethods.includes(cleanMethod)) {
                
                // Auto Create User
                const customerRole = await Role.findOne({ slug: "customer" });
                if (!customerRole) throw createError(500, "Customer Role missing");

                const generatedPass = generateRandomPassword();
                
                const newUser = await User.create({
                    name: shippingAddress.fullName || "Guest Customer",
                    phone: { countryCode, number: userPhone },
                    email: shippingAddress.email,
                    password: generatedPass,
                    role: customerRole._id,
                    isPhoneVerified: false, // Will be verified after payment
                    status: "active"
                });

                await sendSms(userPhone, `Account Created. Login Pass: ${generatedPass}`);

                // Place Order Directly
                const result = await placeOrderInternal(req.body, newUser, ip);

                return res.status(201).json({
                    success: true,
                    message: "Redirecting to payment...",
                    data: result.order,
                    paymentUrl: result.paymentUrl,
                    newUserCredentials: { phone: userPhone, password: generatedPass },
                    requiresVerification: false
                });
            }

            // 🔥 CASE 2: COD (OTP REQUIRED)
            else {
                const otp = generateOTP();
                
                // Clean old OTPs
                await Otp.deleteMany({ "phone.number": userPhone, "phone.countryCode": countryCode });
                
                // Save new OTP
                await Otp.create({ 
                    phone: { countryCode, number: userPhone }, 
                    otp 
                });

                await sendSms(userPhone, `Verification Code: ${otp}`);

                return res.status(200).json({
                    success: true,
                    message: "OTP sent for verification.",
                    requiresVerification: true,
                    phone: userPhone
                });
            }
        }

    } catch (error) { next(error); }
};

// ==================================================================
// 🎮 CONTROLLER 2: VERIFY OTP (Only for New Users + COD)
// ==================================================================
exports.verifyOrderOTP = async (req, res, next) => {
    try {
        const { otp, shippingAddress, ...orderData } = req.body; 
        const userPhone = shippingAddress.phone.number;
        const countryCode = shippingAddress.phone.countryCode || "880";

        // 1. Verify OTP
        const otpRecord = await Otp.findOne({ 
            "phone.number": userPhone, "phone.countryCode": countryCode, otp 
        });

        if (!otpRecord) throw createError(400, "Invalid OTP");

        // 2. Create User
        const customerRole = await Role.findOne({ slug: "customer" });
        const generatedPass = generateRandomPassword();

        const newUser = await User.create({
            name: shippingAddress.fullName,
            phone: { countryCode, number: userPhone },
            email: shippingAddress.email,
            password: generatedPass,
            role: customerRole._id,
            isPhoneVerified: true, 
            status: "active"
        });

        await sendSms(userPhone, `Account Created. Pass: ${generatedPass}`);
        
        // 3. Delete OTP
        await Otp.deleteMany({ "phone.number": userPhone, "phone.countryCode": countryCode });

        // 4. Place Order (COD)
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const fullOrderBody = { shippingAddress, ...orderData };
        
        const result = await placeOrderInternal(fullOrderBody, newUser, ip);

        res.status(201).json({
            success: true,
            message: "User verified and Order placed",
            data: result.order,
            newUserCredentials: { phone: userPhone, password: generatedPass }
        });

    } catch (error) { next(error); }
};

// ==========================================
// 3. USER: Get My Orders
// ==========================================
exports.myOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) { next(error); }
};

// ==========================================
// 4. ADMIN: Get All Orders
// ==========================================
exports.getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    let query = {};
    if (status) query.status = status;
    if (search) query.orderId = search;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(query)
      .populate("user", "name phone")
      .populate("management.assignedTo", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Order.countDocuments(query);
    res.status(200).json({ success: true, totalOrders: total, currentPage: parseInt(page), data: orders });
  } catch (error) { next(error); }
};

// ==========================================
// 5. ADMIN/USER: Get Single Order
// ==========================================
exports.getSingleOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    // চেক করা হচ্ছে এটা MongoDB _id নাকি Custom orderId
    const query = mongoose.Types.ObjectId.isValid(id) 
      ? { _id: id } 
      : { orderId: id };

    const order = await Order.findOne(query)
      .populate("user", "name email phone")
      .populate("items.product", "title slug image");

    if (!order) throw createError(404, "Order not found");

    res.status(200).json({ success: true, data: order });
  } catch (error) { 
    next(error); 
  }
};

// ==========================================
// 6. ADMIN CRM: Assign Order
// ==========================================
exports.assignOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const adminId = req.user._id;
        const order = await Order.findById(orderId);
        if (!order) throw createError(404, "Order not found");
        
        order.management.assignedTo = adminId;
        order.management.status = "processing";
        order.management.logs.push({ action: "Assigned", note: "Admin took responsibility", admin: adminId });
        await order.save();
        res.status(200).json({ success: true, message: "Assigned to you", data: order });
    } catch (error) { next(error); }
};

// ==========================================
// 7. ADMIN CRM: Add Note
// ==========================================
// src/controller/orderController.js

exports.addOrderLog = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { note, status } = req.body;

        let updateData = {
            $push: {
                "management.logs": {
                    action: status ? `Status changed to ${status}` : "Note Added",
                    note: note,
                    admin: req.user._id,
                    date: new Date()
                }
            }
        };

        if (status) {
            updateData["management.status"] = status; 
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true }
        ).populate("management.logs.admin", "name email"); 

        if (!order) throw createError(404, "Order not found");

        res.status(200).json({ 
            success: true, 
            message: "Log updated successfully", 
            data: order 
        });

    } catch (error) { 
        next(error); 
    }
};

// ==========================================
// 8. ADMIN: Settle Finance
// ==========================================
exports.settleCourierPayments = async (req, res, next) => {
    try {
        const { orderIds, transactionId, note } = req.body; 
        if (!orderIds || orderIds.length === 0) throw createError(400, "Select orders to settle");
        const result = await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { "courierSettlement.isSettled": true, "courierSettlement.date": new Date(), "courierSettlement.transactionId": transactionId, "courierSettlement.note": note, "paymentStatus": "paid", "status": "delivered" } }
        );
        res.status(200).json({ success: true, message: `${result.modifiedCount} orders settled successfully` });
    } catch (error) { next(error); }
};

// ==========================================
// 9. ADMIN: General Update
// ==========================================
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, courier, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw createError(404, "Order not found");
    if (status) {
        order.status = status;
        if (status === "delivered") { order.deliveredAt = Date.now(); order.paymentStatus = "paid"; }
    }
    if (courier) { order.courier = { ...order.courier, ...courier }; }
    order.timeline.push({ status: status || order.status, updatedBy: req.user._id, date: Date.now(), note: note || `Status updated to ${status}` });
    await order.save();
    res.status(200).json({ success: true, message: "Order updated", data: order });
  } catch (error) { next(error); }
};


// 10: ADMIN Update Order Status in Bulk
exports.updateOrderStatusBulk = async (req, res, next) => {
  try {
    const { orderIds, status } = req.body;
    if (!orderIds || !orderIds.length) throw createError(400, "No orders selected");
    
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { status: status },
        $push: { timeline: { status, updatedBy: req.user._id, date: Date.now(), note: "Bulk status update" } }
      }
    );
    
    res.status(200).json({ success: true, message: "Orders status updated successfully" });
  } catch (error) { next(error); }
};


// ✅ Update Internal CRM Status
exports.updateCRMStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        "management.status": status,
        $push: { "management.logs": { action: `CRM status changed to ${status}`, admin: req.user._id } }
      },
      { new: true }
    );
    
    if (!order) throw createError(404, "Order not found");
    res.status(200).json({ success: true, message: "CRM status updated" });
  } catch (error) { next(error); }
};

// ✅ Assign Order to Staff (Fixed)
exports.assignOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { assignedTo } = req.body; // এটি হবে User ID (String)

    // যদি assignedTo খালি থাকে, তার মানে Unassign করা হচ্ছে
    const updateData = assignedTo ? assignedTo : null;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        $set: { "management.assignedTo": updateData }, // 🔥 Nested Field Update
        $push: { 
          "management.logs": { 
            action: assignedTo ? "Assigned to staff" : "Unassigned", 
            admin: req.user._id,
            date: new Date()
          } 
        }
      },
      { new: true }
    ).populate("management.assignedTo", "name email"); // Populate করে রেসপন্স পাঠাচ্ছি

    if (!order) throw createError(404, "Order not found");

    res.status(200).json({ 
      success: true, 
      message: assignedTo ? "Staff assigned successfully" : "Order unassigned",
      data: order 
    });

  } catch (error) {
    next(error);
  }
};




// ==========================================
// 11. ADMIN: Update Full Order Details (Items, Address, Price)
// ==========================================
exports.updateOrderDetailsFull = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Frontend থেকে আসা ডাটাগুলো destructure করছি
        const { 
            items, 
            shippingAddress, 
            subTotal, 
            shippingFee, 
            discount, 
            grandTotal 
        } = req.body;

        const order = await Order.findById(id);
        if (!order) throw createError(404, "Order not found");

        // ১. আইটেম আপডেট (যদি থাকে)
        if (items && Array.isArray(items)) {
            order.items = items;
        }

        // ২. শিপিং অ্যাড্রেস আপডেট (যদি থাকে)
        if (shippingAddress) {
            // আগের ডাটার সাথে নতুন ডাটা মার্জ করা হচ্ছে যাতে কিছু মিস না হয়
            order.shippingAddress = {
                ...order.shippingAddress,
                ...shippingAddress,
                phone: {
                    ...order.shippingAddress.phone,
                    ...(shippingAddress.phone || {})
                }
            };
        }

        // ৩. টাকার হিসাব আপডেট (Financials)
        if (subTotal !== undefined) order.subTotal = Number(subTotal);
        if (shippingFee !== undefined) order.shippingFee = Number(shippingFee);
        if (discount !== undefined) order.discount = Number(discount);
        if (grandTotal !== undefined) order.grandTotal = Number(grandTotal);

        // ৪. লগ অ্যাড করা (CRM Log)
        order.management.logs.push({
            action: "Order Details Edited",
            note: "Admin manually updated items, address or pricing.",
            admin: req.user._id, // যে এডমিন এডিট করেছে তার ID
            date: new Date()
        });

        // ৫. সেভ করা
        await order.save();

        res.status(200).json({ 
            success: true, 
            message: "Order details updated successfully", 
            data: order 
        });

    } catch (error) {
        next(error);
    }
};




// ==================================================================
// 🎮 CONTROLLER: POS ORDER CREATE (NEW)
// ==================================================================
exports.createPosOrder = async (req, res, next) => {
    try {
        const { shippingAddress, items, subTotal, shippingFee, discount, grandTotal, paymentMethod } = req.body;

        if (!shippingAddress?.phone?.number) throw createError(400, "Customer phone is required");

        const userPhone = shippingAddress.phone.number;
        const countryCode = shippingAddress.phone.countryCode || "880";
        
        // Settings fetch
        const settings = await GeneralSetting.findOne();
        const storeName = settings?.storeName || "Our Shop";

        // ১. ইউজার চেক করা
        let user = await User.findOne({ "phone.number": userPhone });
        let isNewUser = false;
        let generatedPass = "";

        // ২. ইউজার না থাকলে নতুন অ্যাকাউন্ট খোলা
        if (!user) {
            const customerRole = await Role.findOne({ slug: "customer" });
            if (!customerRole) throw createError(500, "Customer Role configuration missing");

            generatedPass = generateRandomPassword();
            
            user = await User.create({
                name: shippingAddress.fullName || "Walking Customer",
                phone: { countryCode, number: userPhone },
                email: shippingAddress.email || undefined,
                password: generatedPass,
                role: customerRole._id,
                isPhoneVerified: true,
                status: "active"
            });
            
            isNewUser = true;
        }

        // ৩. নতুন ইউজার হলে SMS পাঠানো
        if (isNewUser) {
            try {
                const loginMsg = `Welcome to ${storeName}! Account created. Login Pass: ${generatedPass}. Order online next time!`;
                await sendSms(userPhone, loginMsg);
            } catch (smsError) {
                console.error("Welcome SMS Failed:", smsError.message);
            }
        }

        // ৪. অর্ডার প্লেস করা
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        const orderData = {
            items,
            shippingAddress,
            paymentMethod: paymentMethod || "cod",
            paymentStatus: "paid",
            status: "delivered",
            subTotal, shippingFee, discount, grandTotal
        };

        const result = await placeOrderInternal(orderData, user, ip, { sendOrderSms: false });


        await createAdminNotification(
            "New POS Order", 
            `A new POS order (${result.order.orderId}) has been created.`, 
            "order", 
            `/admin/orders/${result.order._id}`
        );

        
        // ৫. রেসপন্স (newUser বাদ দেওয়া হয়েছে)
        res.status(201).json({
            success: true,
            message: "POS Order created successfully",
            data: result.order
        });

    } catch (error) {
        next(error);
    }
};



// ==========================================
// 12. ADMIN: Delete Order
// ==========================================
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 🔥 MAIN LOGIC: Prevent deletion if paid & delivered
    if (order.paymentStatus === 'paid' && order.status === 'delivered') {
        return res.status(403).json({ 
            success: false, 
            message: "Action Denied! Paid and Delivered orders cannot be deleted for accounting and record-keeping purposes." 
        });
    }

    // যদি ক্যানসেলড বা পেন্ডিং থাকে, তাহলেই শুধু ডিলিট হবে
    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: "Order deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// 13. ADMIN: Convert Failed/Pending Payment to COD
// ==========================================
exports.convertPaymentToCod = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) throw createError(404, "Order not found");

        // 🔥 Security Check: If already paid or delivered, stop conversion
        if (order.paymentStatus === 'paid' || order.status === 'delivered') {
            return res.status(403).json({ 
                success: false, 
                message: "Action Denied! Paid or Delivered orders cannot be modified." 
            });
        }

        // 🔥 Forceful Atomic Update using $set
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    paymentMethod: "cod",      // Fully reset to COD
                    paymentStatus: "pending"   // Reset payment status
                },
                $push: {
                    "management.logs": {
                        action: "Converted to COD",
                        note: "Admin manually converted digital payment to COD after phone confirmation.",
                        admin: req.user._id,
                        date: new Date()
                    },
                    timeline: {
                        status: order.status,
                        updatedBy: req.user._id,
                        date: new Date(),
                        note: "Payment method changed to Cash on Delivery (COD)"
                    }
                }
            },
            { new: true } // রিটার্নে আপডেট হওয়া ডাটা পাঠাবে
        );

        res.status(200).json({ 
            success: true, 
            message: "Order successfully converted to COD!", 
            data: updatedOrder 
        });
    } catch (error) { 
        next(error); 
    }
};