const SmsTemplate = require("../models/SmsTemplate");
const createError = require("http-errors");

// Get SMS Templates
exports.getSmsTemplates = async (req, res, next) => {
    try {
        let templates = await SmsTemplate.findOne();
        
        // যদি ডাটাবেসে আগে থেকে কোনো টেমপ্লেট না থাকে, তবে ডিফল্ট ভ্যালু দিয়ে একটি তৈরি করে নিবে
        if (!templates) {
            templates = await SmsTemplate.create({});
        }

        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        next(error);
    }
};

// Update SMS Templates
exports.updateSmsTemplates = async (req, res, next) => {
    try {
        let templates = await SmsTemplate.findOne();

        if (!templates) {
            // যদি না থাকে, তবে বডির ডাটা দিয়ে নতুন তৈরি করবে
            templates = await SmsTemplate.create(req.body);
        } else {
            // থাকলে আপডেট করবে
            templates = await SmsTemplate.findOneAndUpdate(
                {}, 
                req.body, 
                { new: true, runValidators: true }
            );
        }

        res.status(200).json({ 
            success: true, 
            message: "SMS templates updated successfully", 
            data: templates 
        });
    } catch (error) {
        next(error);
    }
};