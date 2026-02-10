const axios = require("axios");
const SmsLog = require("../models/SmsLog");
const SmsGateway = require("../models/SmsGateway");

/**
 * Dynamic SMS Sender
 * Finds the active gateway from DB and sends SMS
 */
const sendSms = async (number, message, adminId = null) => {
  try {
    // 1. Find Active Gateway
    const gateway = await SmsGateway.findOne({ status: "active" });

    if (!gateway) {
      throw new Error("No active SMS gateway found. Please configure settings.");
    }

    let responseData = null;
    let isSuccess = false;
    let messageId = null;

    // 2. Provider Specific Logic
    if (gateway.provider === "bulksmsbd") {
      // BulksmsBD Logic
      const params = {
        api_key: gateway.apiKey,
        senderid: gateway.senderId,
        number: number,
        message: message,
      };
      
      const res = await axios.post(gateway.baseUrl, null, { params });
      responseData = res.data;
      
      // BulksmsBD success code is usually 202
      isSuccess = res.data.response_code === 202;
      messageId = res.data.message_id || null;

    } else if (gateway.provider === "greenweb") {
      // GreenWeb Logic
      const params = {
        token: gateway.apiKey,
        to: number,
        message: message,
      };
      
      // GreenWeb sends GET/POST request
      const res = await axios.post(gateway.baseUrl, params); 
      responseData = res.data;
      
      // Check documentation for success condition
      isSuccess = res.data[0]?.status === "SENT"; 
      messageId = res.data[0]?.statusmsgid || null;
    } 
    
    // 3. Create Log
    await SmsLog.create({
      recipient: number,
      message,
      provider: gateway.provider,
      status: isSuccess ? "sent" : "failed",
      gatewayMessageId: messageId,
      sentBy: adminId,
    });

    if (!isSuccess) {
      throw new Error(JSON.stringify(responseData));
    }

    return { success: true, data: responseData };

  } catch (error) {
    console.error(`SMS Error (${number}):`, error.message);

    // Failed Log
    await SmsLog.create({
      recipient: number,
      message,
      provider: "system", // or unknown
      status: "failed",
      sentBy: adminId,
    });

    return { success: false, error: error.message };
  }
};

module.exports = sendSms;