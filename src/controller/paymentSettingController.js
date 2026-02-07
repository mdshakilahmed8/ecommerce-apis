const PaymentSetting = require("../models/PaymentSetting");
const createError = require("http-errors");

// Get All Settings
exports.getAllPaymentSettings = async (req, res, next) => {
    try {
        const settings = await PaymentSetting.find({});
        res.status(200).json({ success: true, data: settings });
    } catch (error) { next(error); }
};

// Create or Update Setting
exports.updatePaymentSetting = async (req, res, next) => {
    try {
        const { provider, isActive, storeId, storePassword, username, password, isSandbox } = req.body;
        
        // Check valid provider
        if(!["sslcommerz", "bkash", "nagad", "cod"].includes(provider)) {
            throw createError(400, "Invalid provider");
        }

        let setting = await PaymentSetting.findOne({ provider });

        if (setting) {
            // Update
            if(storeId) setting.storeId = storeId;
            if(storePassword) setting.storePassword = storePassword;
            if(username) setting.username = username;
            if(password) setting.password = password;
            if(typeof isActive !== 'undefined') setting.isActive = isActive;
            if(typeof isSandbox !== 'undefined') setting.isSandbox = isSandbox;
            await setting.save();
        } else {
            // Create
            setting = await PaymentSetting.create(req.body);
        }

        res.status(200).json({ success: true, message: `${provider} settings updated`, data: setting });
    } catch (error) { next(error); }
};