const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
    isActive: { type: Boolean, default: true },
    message: { type: String, required: true }
}, { _id: false });

const smsTemplateSchema = new mongoose.Schema({
    orderPlaced: {
        type: templateSchema,
        default: () => ({
            isActive: true,
            message: "Dear {customer_name}, your order #{order_id} has been successfully placed. Total amount: BDT {total_amount}. Thank you for shopping with us!"
        })
    },
    orderStatusChanged: {
        type: templateSchema,
        default: () => ({
            isActive: true,
            message: "Dear {customer_name}, the status of your order #{order_id} has been updated to: {order_status}."
        })
    },
    accountCreated: {
        type: templateSchema,
        default: () => ({
            isActive: true,
            message: "Welcome {customer_name}! Your account has been successfully created at {store_name}."
        })
    },
    // 🔥 NEW: Auto Account Created (With Password)
    autoAccountCreated: {
        type: templateSchema,
        default: () => ({
            isActive: true,
            message: "Hello {customer_name}, an account has been created for you at {store_name}. Your login ID is {phone} and password is {password}. Please change your password after login."
        })
    },
    otpVerification: {
        type: templateSchema,
        default: () => ({
            isActive: true,
            message: "Your verification OTP is {otp}. It will expire in {expire_time} minutes. Do not share this with anyone."
        })
    },
    paymentSuccess: {
        type: templateSchema,
        default: () => ({
            isActive: true,
            message: "Dear {customer_name}, we have received your payment of BDT {paid_amount} for order #{order_id}. Thank you!"
        })
    }
}, { timestamps: true });

module.exports = mongoose.model("SmsTemplate", smsTemplateSchema);