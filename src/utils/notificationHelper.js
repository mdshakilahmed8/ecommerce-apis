const Notification = require("../models/Notification");

/**
 * @desc Reusable method to create admin notifications
 * @param {String} title - Notification title (e.g., "New Order")
 * @param {String} message - Detailed message
 * @param {String} type - Type of notification ('order', 'alert', 'info')
 * @param {String} link - Admin panel link to redirect (e.g., "/admin/orders/ID")
 */

const createAdminNotification = async (title, message, type = "info", link = "") => {
  try {
    const notification = await Notification.create({
      title,
      message,
      type,
      link,
      isRead: false
    });

    // 🔥 Emit Real-time Notification
    if (global.io) {
      global.io.emit("newNotification", {
        notification,
        unreadCount: await Notification.countDocuments({ isRead: false })
      });
    }

    console.log(`🔔 Notification Created: ${title}`);
  } catch (error) {
    console.error("❌ Notification Error:", error);
  }
};

module.exports = { createAdminNotification };