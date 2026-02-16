const Product = require("../models/Product");
const Order = require("../models/Order");
const Notification = require("../models/Notification");

// 🔍 Global Search (Orders & Products)
exports.globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Query required" });

    const regex = new RegExp(q, "i");

    // Parallel Search
        const [products, orders] = await Promise.all([
        Product.find({ 
            $or: [{ title: regex }, { sku: regex }] 
        }).select("title sku images slug").limit(5),
        
        Order.find({ 
            $or: [
            { orderId: regex }, 
            { "shippingAddress.phone": regex }, // যদি ফোন স্ট্রিং হয়
            { "shippingAddress.phone.number": regex } // যদি ফোন অবজেক্ট হয়
            ] 
        }).select("orderId grandTotal status").limit(5)
        ]);

    res.status(200).json({
      success: true,
      data: { products, orders }
    });
  } catch (error) {
    next(error);
  }
};

// 🔔 Get Notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(20); // Last 20 notifications
    
    // Count unread
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// 👀 Mark Notification as Read
exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    // If id is 'all', mark all as read
    if (id === 'all') {
      await Notification.updateMany({ isRead: false }, { isRead: true });
    } else {
      await Notification.findByIdAndUpdate(id, { isRead: true });
    }
    res.status(200).json({ success: true, message: "Marked as read" });
  } catch (error) {
    next(error);
  }
};