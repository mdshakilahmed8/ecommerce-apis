const StoreLicense = require("../models/StoreLicense");

// লাইসেন্স কি নিয়ে আসার জন্য (GET)
exports.getLicense = async (req, res, next) => {
    try {
        // ডাটাবেস থেকে প্রথম রেকর্ডটি খুঁজবে (যেহেতু একটাই লাইসেন্স থাকবে)
        const license = await StoreLicense.findOne();
        
        if (!license) {
            return res.status(200).json({ 
                success: true, 
                data: null, 
                message: "No license found. Please activate your store." 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            data: license 
        });
    } catch (error) { 
        next(error); 
    }
};

// নতুন লাইসেন্স কি সেভ বা আপডেট করার জন্য (POST)
exports.saveLicense = async (req, res, next) => {
    try {
        const { licenseKey } = req.body;
        
        if (!licenseKey) {
            return res.status(400).json({ 
                success: false, 
                message: "License key is required" 
            });
        }

        // ডাটাবেসে আগে থেকে লাইসেন্স থাকলে সেটি আপডেট করবে, না থাকলে নতুন তৈরি করবে
        let license = await StoreLicense.findOne();
        
        if (license) {
            license.licenseKey = licenseKey;
            await license.save();
        } else {
            license = await StoreLicense.create({ licenseKey });
        }

        res.status(200).json({ 
            success: true, 
            message: "License saved successfully!", 
            data: license 
        });
    } catch (error) { 
        next(error); 
    }
};