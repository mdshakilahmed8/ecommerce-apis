const ShippingSetting = require("../models/ShippingSetting");

// 1. Get Settings
exports.getShippingSettings = async (req, res, next) => {
  try {
    let settings = await ShippingSetting.findOne();
    
    // যদি ডাটাবেজে না থাকে, তবে ডিফল্ট কিছু জোন দিয়ে তৈরি করবে
    if (!settings) {
      settings = await ShippingSetting.create({
        deliveryZones: [
          { name: "Inside Dhaka", cost: 60 },
          { name: "Outside Dhaka", cost: 120 }
        ]
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) { 
    next(error); 
  }
};

// 2. Update Settings
exports.updateShippingSettings = async (req, res, next) => {
  try {
    let settings = await ShippingSetting.findOne();

    if (!settings) {
      settings = new ShippingSetting();
    }

    const { 
      deliveryZones, // 🔥 Array from frontend
      isStorePickupActive, 
      isFreeShippingActive, 
      freeShippingThreshold 
    } = req.body;

    // Update Fields
    if(deliveryZones !== undefined) settings.deliveryZones = deliveryZones;
    if(isStorePickupActive !== undefined) settings.isStorePickupActive = isStorePickupActive;
    if(isFreeShippingActive !== undefined) settings.isFreeShippingActive = isFreeShippingActive;
    if(freeShippingThreshold !== undefined) settings.freeShippingThreshold = freeShippingThreshold;

    await settings.save();

    res.status(200).json({ 
        success: true, 
        message: "Shipping settings updated successfully", 
        data: settings 
    });
  } catch (error) { 
      next(error); 
  }
};