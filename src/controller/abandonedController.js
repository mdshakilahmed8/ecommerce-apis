const AbandonedCheckout = require("../models/AbandonedCheckout");

exports.syncAbandonedCheckout = async (req, res, next) => {
  try {
    const { 
        guestId, 
        shippingAddress, 
        items, 
        subTotal, 
        grandTotal, 
        dropOffStage 
    } = req.body;
    
    // চেক করি ইউজার লগইন করা আছে কিনা (Auth Middleware থেকে আসবে)
    const userId = req.user ? req.user._id : undefined;

    // ভ্যালিডেশন: গেস্ট আইডি অথবা ইউজার আইডি থাকতেই হবে
    if (!guestId && !userId) {
        return res.status(400).json({ success: false, message: "Guest ID required" });
    }

    // ==========================================
    // 🔥 IP Extraction Logic
    // ==========================================
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    
    // যদি প্রক্সির কারণে মাল্টিপল IP আসে (e.g. "client_ip, proxy_ip"), প্রথমটা নিব
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }

    // ==========================================
    // 🔍 Find Logic
    // ==========================================
    let query = {};
    if (userId) query.user = userId;
    else query.guestId = guestId;

    // চেক করি কোনো ড্রাফট আছে কিনা যেটা এখনো রিকভার (অর্ডার) হয়নি
    let abandoned = await AbandonedCheckout.findOne({ ...query, isRecovered: false });

    if (abandoned) {
        // ==========================================
        // 🔄 UPDATE EXISTING DRAFT
        // ==========================================
        
        // Shipping Address মার্জ করা (যাতে আগের ডাটা হারিয়ে না যায়)
        if (shippingAddress) {
            abandoned.shippingAddress = { 
                ...abandoned.shippingAddress, // আগের ডাটা (যদি থাকে)
                ...shippingAddress            // নতুন ডাটা
            };
        }

        if (items) abandoned.items = items;
        if (subTotal) abandoned.subTotal = subTotal;
        if (grandTotal) abandoned.grandTotal = grandTotal;
        if (dropOffStage) abandoned.dropOffStage = dropOffStage;
        
        // যদি ইউজার আগে গেস্ট ছিল এখন লগইন করেছে, তাহলে লিংক করে দিব
        if (userId && !abandoned.user) abandoned.user = userId;
        
        // ✅ IP আপডেট করা (ইউজার লোকেশন চেঞ্জ করলে লেটেস্টটা থাকবে)
        abandoned.ipAddress = ip;
        
        await abandoned.save();

    } else {
        // ==========================================
        // 🆕 CREATE NEW DRAFT
        // ==========================================
        abandoned = await AbandonedCheckout.create({
            guestId,
            user: userId,
            ipAddress: ip, // ✅ IP Save
            shippingAddress, 
            items,
            subTotal,
            grandTotal,
            dropOffStage
        });
    }

    res.status(200).json({ 
        success: true, 
        message: "Abandoned checkout synced successfully", 
        data: abandoned 
    });

  } catch (error) {
    next(error);
  }
};




// অ্যাডমিনদের জন্য সব ইনকমপ্লিট অর্ডারের লিস্ট (With Pagination)
exports.getAllAbandonedAdmin = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, status } = req.query;
        let query = { isRecovered: false }; // শুধু যেগুলো রিকভার হয়নি

        if (status) query["management.status"] = status;

        if (search) {
            query["$or"] = [
                { "shippingAddress.phone.number": { $regex: search, $options: "i" } },
                { "shippingAddress.fullName": { $regex: search, $options: "i" } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const data = await AbandonedCheckout.find(query)
            .populate("items.product", "title image price")
            .populate("management.assignedTo", "name email") // কে অ্যাসাইনড আছে
            .populate("management.logs.admin", "name") // লগে অ্যাডমিনের নাম
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AbandonedCheckout.countDocuments(query);

        res.status(200).json({
            success: true,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            data
        });
    } catch (error) {
        next(error);
    }
};

// স্ট্যাটাস আপডেট এবং অ্যাডমিন অ্যাসাইন করা
exports.updateAbandonedCRM = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note, assignedTo } = req.body;

        const abandoned = await AbandonedCheckout.findById(id);
        if (!abandoned) throw createError(404, "Abandoned checkout not found");

        if (status) abandoned.management.status = status;
        if (assignedTo) abandoned.management.assignedTo = assignedTo;

        // অ্যাকশন লগ তৈরি
        abandoned.management.logs.push({
            action: status ? `Status changed to ${status}` : "Note Added",
            note: note || "Information updated",
            admin: req.user._id,
            date: new Date()
        });

        await abandoned.save();
        res.status(200).json({ success: true, message: "CRM Updated", data: abandoned });
    } catch (error) {
        next(error);
    }
};