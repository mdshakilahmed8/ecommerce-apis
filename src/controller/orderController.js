const Order = require("../models/Order");
const AbandonedCheckout = require("../models/AbandonedCheckout");
const Product = require("../models/Product");
const User = require("../models/User");
const Role = require("../models/Role");
const Otp = require("../models/Otp");
const createError = require("http-errors");
const crypto = require("crypto");
// const axios = require("axios");

// ==========================================
// 🛠️ HELPERS
// ==========================================
// const generateOrderId = () => {
//   const timestamp = Date.now().toString().slice(-6);
//   const random = Math.floor(1000 + Math.random() * 9000);
//   return `ORD-${timestamp}-${random}`;
// };

// --- HELPER: Generate Short Unique ID ---
const generateOrderId = () => {
  // ১. কনফিউজিং ক্যারেক্টার (যেমন I, 1, O, 0) বাদ দিয়ে একটি সেট বানালাম
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
  let result = "";
  
  // ২. ৬ ডিজিটের র‍্যান্ডম কোড তৈরি (Unique Combination: ~1 Billion)
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `ORD-${result}`; // Output Example: ORD-X7K9P2
};

const generateRandomPassword = () => crypto.randomBytes(4).toString('hex');
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ SMS Sender (Dummy: Replace with Real API)
const sendSms = async (to, message) => {
    console.log(`📨 [SMS to ${to}]: ${message}`);
    // await axios.post(...) 
};

// ==================================================================
// ⚙️ SHARED INTERNAL FUNCTION: REAL ORDER PLACEMENT LOGIC
// ==================================================================
// এই ফাংশনটি 'initiateOrder' এবং 'verifyOrderOTP' দুই জায়গা থেকেই কল হবে।
// এর কাজ: স্টক চেক করা, প্রাইস ক্যালকুলেট করা এবং অর্ডার সেভ করা।
const placeOrderInternal = async (orderData, user, ip) => {
    const { items, shippingAddress, paymentMethod, shippingFee, discount, guestId } = orderData;

    // 1. Re-calculate Items from Database (SECURITY)
    let finalOrderItems = [];
    let calculatedSubTotal = 0;

    for (const item of items) {
        // Fetch Product
        const dbProduct = await Product.findById(item.product);
        if (!dbProduct) throw createError(404, `Product not found: ${item.product}`);

        let finalPrice = 0, finalName = dbProduct.title, finalSku = "GEN-SKU";
        let finalImage = dbProduct.images[0] || "";

        // Handle Variants
        if (item.variantId) {
            const variant = dbProduct.variants.find(v => v._id.toString() === item.variantId);
            
            if (!variant) throw createError(400, `Variant not found: ${dbProduct.title}`);
            if (variant.stock < item.quantity) throw createError(400, `Stock out: ${dbProduct.title}`);
            
            variant.stock -= item.quantity;
            finalPrice = variant.price;
            finalSku = variant.sku || "VAR-SKU";
            if (variant.image) finalImage = variant.image;
            const attrString = Object.values(variant.attributes || {}).join(" ");
            if (attrString) finalName = `${dbProduct.title} - ${attrString}`;
        } else {
            // Handle Simple Product
            if (dbProduct.hasVariants && !item.variantId) throw createError(400, `Select variant for ${dbProduct.title}`);
            if (dbProduct.stock < item.quantity) throw createError(400, `Stock out: ${dbProduct.title}`);
            
            dbProduct.stock -= item.quantity;
            finalPrice = dbProduct.discountPrice || dbProduct.price;
        }

        dbProduct.sold += item.quantity;
        await dbProduct.save();

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

    // 2. Financials
    const finalShippingFee = Number(shippingFee) || 0;
    const finalDiscount = Number(discount) || 0;
    const calculatedGrandTotal = (calculatedSubTotal + finalShippingFee) - finalDiscount;

    // 3. Create Order
    const orderId = generateOrderId();
    const order = new Order({
        orderId,
        user: user._id,
        ipAddress: ip,
        items: finalOrderItems,
        shippingAddress: {
            ...shippingAddress,
            phone: { 
                countryCode: shippingAddress.phone.countryCode || "+880", 
                number: shippingAddress.phone.number 
            }
        },
        paymentMethod,
        paymentStatus: paymentMethod === "Online" ? "paid" : "pending",
        subTotal: calculatedSubTotal,
        shippingFee: finalShippingFee,
        discount: finalDiscount,
        grandTotal: calculatedGrandTotal,
        status: "pending",
        management: { 
            status: "new", 
            logs: [{ action: "Order Placed", note: "Order Created Successfully", date: new Date() }] 
        },
        timeline: [{ status: "pending", updatedBy: user._id, date: new Date(), note: "Order placed" }]
    });

    await order.save();

    // 4. Send Confirmation SMS
    await sendSms(shippingAddress.phone.number, `Order ${orderId} confirmed! Total: ${calculatedGrandTotal} Tk. Thanks- Goni Food.`);

    // 5. Cleanup Abandoned Cart
    if (guestId) {
        await AbandonedCheckout.findOneAndDelete({ guestId: guestId });
    }

    return order;
};

// ==================================================================
// 🎮 CONTROLLER 1: INITIATE ORDER (Step 1)
// ==================================================================
// কাজ: ইউজার চেক করা। পুরনো হলে অর্ডার প্লেস করা, নতুন হলে OTP পাঠানো।
exports.initiateOrder = async (req, res, next) => {
    try {
        const { shippingAddress } = req.body;
        
        if (!shippingAddress?.phone?.number) throw createError(400, "Phone number required");

        const userPhone = shippingAddress.phone.number;
        const countryCode = shippingAddress.phone.countryCode || "+880";
        
        // 1. Check if User Exists (Login ID or Phone)
        let user = req.user ? await User.findById(req.user._id) : await User.findOne({ "phone.number": userPhone });

        // A. EXISTING USER -> PLACE ORDER DIRECTLY
        if (user) {
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
            const order = await placeOrderInternal(req.body, user, ip);

            return res.status(201).json({
                success: true,
                message: "Order placed successfully",
                data: order,
                requiresVerification: false // Frontend: No OTP needed
            });
        } 
        
        // B. NEW USER -> SEND OTP
        else {
            const otp = generateOTP();
            
            // Delete old OTPs
            await Otp.deleteMany({ "phone.number": userPhone, "phone.countryCode": countryCode });

            // Save new OTP
            await Otp.create({ 
                phone: { countryCode: countryCode, number: userPhone }, 
                otp: otp 
            });

            // Send SMS
            await sendSms(userPhone, `Goni Food Verification Code: ${otp}. Valid for 5 minutes.`);

            return res.status(200).json({
                success: true,
                message: "User not found. OTP sent for verification.",
                requiresVerification: true, // Frontend: Show OTP Modal
                phone: userPhone
            });
        }

    } catch (error) { next(error); }
};

// ==================================================================
// 🎮 CONTROLLER 2: VERIFY OTP & PLACE ORDER (Step 2)
// ==================================================================
// কাজ: OTP ভেরিফাই করে নতুন ইউজার তৈরি করা এবং অর্ডার প্লেস করা।
exports.verifyOrderOTP = async (req, res, next) => {
    try {
        const { otp, shippingAddress, ...orderData } = req.body; 

        const userPhone = shippingAddress.phone.number;
        const countryCode = shippingAddress.phone.countryCode || "+880";

        // 1. Verify OTP
        const otpRecord = await Otp.findOne({ 
            "phone.number": userPhone, 
            "phone.countryCode": countryCode, 
            otp: otp 
        });

        if (!otpRecord) throw createError(400, "Invalid or Expired OTP");

        // 2. Create New User
        const customerRole = await Role.findOne({ slug: "customer" }); // Ensure 'customer' slug exists in Roles
        if (!customerRole) throw createError(500, "System Error: Customer Role missing");

        const generatedPass = generateRandomPassword();

        const newUser = await User.create({
            name: shippingAddress.fullName || "Valued Customer",
            phone: { countryCode, number: userPhone },
            email: shippingAddress.email || undefined,
            password: generatedPass,
            role: customerRole._id,
            isPhoneVerified: true, 
            status: "active"
        });

        // 3. Send Welcome SMS
        await sendSms(userPhone, `Welcome! Your Account Created. Pass: ${generatedPass}`);

        // 4. Delete OTP (Used)
        await Otp.deleteMany({ "phone.number": userPhone, "phone.countryCode": countryCode });

        // 5. Place the Order
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        
        // Reconstruct body
        const fullOrderBody = { shippingAddress, ...orderData };
        const order = await placeOrderInternal(fullOrderBody, newUser, ip);

        res.status(201).json({
            success: true,
            message: "User verified and Order placed successfully",
            data: order,
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
// 5. ADMIN: Get Single Order Details
// ==========================================
exports.getSingleOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "title slug image");

    if (!order) throw createError(404, "Order not found");

    // Security Check
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
        if (order.management.assignedTo && order.management.assignedTo.toString() !== adminId.toString()) {
            throw createError(409, "Order already assigned to another admin");
        }
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