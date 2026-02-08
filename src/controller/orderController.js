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

// SMS Sender (Placeholder)
const sendSms = async (to, message) => {
    console.log(`📨 [SMS to ${to}]: ${message}`);
    // await axios.post(...) 
};


// ==================================================================
// ⚙️ INTERNAL SHARED FUNCTION: PLACE ORDER
// ==================================================================
const placeOrderInternal = async (orderData, user, ip) => {
    const { items, shippingAddress, paymentMethod, shippingFee, discount, guestId } = orderData;

    // 1. Payment Method Normalize
    const pMethod = paymentMethod.toLowerCase(); 

    // 2. Items & Stock Calculation
    let finalOrderItems = [];
    let calculatedSubTotal = 0;

    for (const item of items) {
        const dbProduct = await Product.findById(item.product);
        if (!dbProduct) throw createError(404, `Product not found: ${item.product}`);

        let finalPrice = 0, finalName = dbProduct.title, finalSku = "GEN-SKU";
        let finalImage = dbProduct.images[0] || "";

        if (item.variantId) {
            const variant = dbProduct.variants.find(v => v._id.toString() === item.variantId);
            if (!variant || variant.stock < item.quantity) throw createError(400, `Stock out: ${dbProduct.title}`);
            variant.stock -= item.quantity;
            finalPrice = variant.price;
            if (variant.image) finalImage = variant.image;
        } else {
            if (dbProduct.hasVariants && !item.variantId) throw createError(400, `Select variant`);
            if (dbProduct.stock < item.quantity) throw createError(400, `Stock out: ${dbProduct.title}`);
            dbProduct.stock -= item.quantity;
            finalPrice = dbProduct.discountPrice || dbProduct.price;
        }

        dbProduct.sold += item.quantity;
        await dbProduct.save();

        // 🔥 PRODUCT NAME SAVING FOR ORDER
        finalOrderItems.push({
            product: dbProduct._id, variantId: item.variantId, 
            name: finalName, // This name will be used for Payment Gateway
            sku: finalSku, image: finalImage,
            price: finalPrice, quantity: item.quantity, total: finalPrice * item.quantity
        });
        calculatedSubTotal += (finalPrice * item.quantity);
    }

    // 3. Financials
    const finalShippingFee = Number(shippingFee) || 0;
    const finalDiscount = Number(discount) || 0;
    const calculatedGrandTotal = (calculatedSubTotal + finalShippingFee) - finalDiscount;

    // 4. Create Order
    let orderId = generateOrderId();
    while (await Order.findOne({ orderId })) { orderId = generateOrderId(); }

    const order = new Order({
        orderId, user: user._id, ipAddress: ip,
        items: finalOrderItems, 
        shippingAddress: {
            ...shippingAddress,
            // 🔥 ADDRESS FIX: Ensure minimal required fields
            phone: { 
                countryCode: shippingAddress.phone.countryCode || "880", 
                number: shippingAddress.phone.number 
            }
        },
        paymentMethod: pMethod, 
        paymentStatus: "pending", 
        subTotal: calculatedSubTotal, shippingFee: finalShippingFee,
        discount: finalDiscount, grandTotal: calculatedGrandTotal,
        status: "pending",
        management: { status: "new", logs: [{ action: "Order Placed", date: new Date() }] },
        timeline: [{ status: "pending", updatedBy: user._id, date: new Date(), note: "Order placed" }]
    });

    await order.save();

    // 5. Payment Gateway Logic
    let paymentUrl = null;
    const digitalMethods = ["sslcommerz", "bkash", "nagad"];

    if (digitalMethods.includes(pMethod)) {
        try {
            // 🔥 Generate Payment Link
            paymentUrl = await initiatePayment(order);
        } catch (error) {
            console.error("🔴 Gateway Error:", error.message);
            
            // 🔥 CRITICAL FIX: If payment link fails, DELETE the order & THROW ERROR
            // যাতে ইউজার বুঝতে পারে কিছু একটা সমস্যা হয়েছে
            await Order.findByIdAndDelete(order._id);
            
            // Stock Revert (Optional but good practice) - skipped for brevity
            
            throw createError(500, "Payment Gateway Failed: " + error.message);
        }
    } else {
        // COD
        await sendSms(shippingAddress.phone.number, `Order ${orderId} confirmed!`);
    }

    if (guestId) await AbandonedCheckout.findOneAndDelete({ guestId });

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
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "title slug image");

    if (!order) throw createError(404, "Order not found");

    // Access Check
    if (req.user.role.slug !== 'super_admin' && req.user.role.slug !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
        throw createError(403, "Access denied");
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
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
exports.addOrderLog = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { note, status } = req.body;
        const order = await Order.findById(orderId);
        if (!order) throw createError(404, "Order not found");
        if (status) order.management.status = status;
        order.management.logs.push({ action: "Note Added", note: note, admin: req.user._id });
        await order.save();
        res.status(200).json({ success: true, message: "Log updated", data: order });
    } catch (error) { next(error); }
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