const mongoose = require("mongoose");

const storeLicenseSchema = new mongoose.Schema({
    licenseKey: { 
        type: String, 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model("StoreLicense", storeLicenseSchema);