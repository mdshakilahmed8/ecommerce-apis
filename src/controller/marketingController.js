const sendSms = require("../utils/smsSender");
const createError = require("http-errors");
const SmsLog = require("../models/SmsLog");
const ExcelJS = require("exceljs"); // ✅ Import ExcelJS

// --- Send Bulk SMS ---
exports.sendBulkSms = async (req, res, next) => {
  try {
    const { recipients, message } = req.body; 
    // recipients: ["88017...", "88019..."]

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "Recipient list is empty." });
    }

    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }

    // --- Bulk Sending Logic ---
    // Promise.all ব্যবহার করে প্যারালাল প্রসেসিং (দ্রুত গতির জন্য)
    const results = await Promise.all(
      recipients.map(async (number) => {
        return await sendSms(number, message, req.user._id);
      })
    );

    // Calculate Stats
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Campaign Processed. Sent: ${successCount}, Failed: ${failedCount}`,
      data: {
        total: recipients.length,
        sent: successCount,
        failed: failedCount
      }
    });

  } catch (error) {
    next(error);
  }
};


// --- 2. Get SMS History (With Search) ---
exports.getSmsLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || ""; // সার্চ কুয়েরি
    const skip = (page - 1) * limit;

    // 🔍 Search Logic
    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, "i"); // Case insensitive
      query = {
        $or: [
          { recipient: searchRegex },      // ফোন নাম্বার দিয়ে সার্চ
          { message: searchRegex },        // মেসেজ কন্টেন্ট দিয়ে সার্চ
          { status: searchRegex },         // স্ট্যাটাস দিয়ে সার্চ (sent/failed)
          { provider: searchRegex },       // প্রোভাইডার দিয়ে সার্চ
        ],
      };
    }

    const logs = await SmsLog.find(query)
      .populate("sentBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SmsLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// --- 3. Export to Excel (New) ---
exports.exportSmsLogs = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    
    // সার্চ অনুযায়ী ফিল্টার করা ডাটা (No Pagination)
    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query = {
        $or: [
          { recipient: searchRegex },
          { message: searchRegex },
          { status: searchRegex },
        ],
      };
    }

    const logs = await SmsLog.find(query).populate("sentBy", "name").sort({ createdAt: -1 });

    // Excel Workbook তৈরি
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("SMS Logs");

    // কলাম হেডার সেট করা
    worksheet.columns = [
      { header: "Date", key: "createdAt", width: 20 },
      { header: "Recipient", key: "recipient", width: 15 },
      { header: "Message", key: "message", width: 40 },
      { header: "Provider", key: "provider", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Sent By", key: "sentBy", width: 20 },
    ];

    // ডাটা যোগ করা
    logs.forEach((log) => {
      worksheet.addRow({
        createdAt: new Date(log.createdAt).toLocaleString(),
        recipient: log.recipient,
        message: log.message,
        provider: log.provider,
        status: log.status,
        sentBy: log.sentBy ? log.sentBy.name : "System",
      });
    });

    // রেসপন্স হেডার সেট করা (ডাউনলোডের জন্য)
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sms_logs.xlsx"
    );

    // ফাইল রাইট করা
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};