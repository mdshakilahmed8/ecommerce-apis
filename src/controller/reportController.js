const Order = require("../models/Order");
const ExcelJS = require("exceljs");
const Product = require("../models/Product");

// GET Comprehensive Analytics (Dashboard View)
exports.getComprehensiveReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Filter: Only valid orders (excluding cancelled)
    const matchStage = {
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ["cancelled", "returned"] }
    };

    const report = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          // 1. Overall Financials
          "financials": [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$grandTotal" },
                totalSubTotal: { $sum: "$subTotal" },
                totalShippingFees: { $sum: "$shippingFee" },
                totalDiscount: { $sum: "$discount" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$grandTotal" },
                totalSettled: { $sum: "$courierSettlement.amountReceived" } // Actual Cash in Hand from Courier
              }
            }
          ],

          // 2. Sales by Product (Top Selling)
          "productPerformance": [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.sku", // Group by SKU
                productName: { $first: "$items.name" },
                totalSold: { $sum: "$items.quantity" },
                revenueGenerated: { $sum: "$items.total" }
              }
            },
            { $sort: { revenueGenerated: -1 } },
            { $limit: 10 }
          ],

          // 3. Courier Settlement Status (COD Logic)
          "courierStats": [
            { $match: { paymentMethod: "cod" } }, // Only COD orders need settlement checking
            {
              $group: {
                _id: "$courierSettlement.isSettled",
                count: { $sum: 1 },
                totalAmount: { $sum: "$grandTotal" },
                receivedAmount: { $sum: "$courierSettlement.amountReceived" }
              }
            }
          ],

          // 4. Sales by Payment Method
          "paymentMethods": [
            {
              $group: {
                _id: "$paymentMethod",
                count: { $sum: 1 },
                totalAmount: { $sum: "$grandTotal" }
              }
            }
          ],

          // 5. Sales by City (Location Analysis)
          "locationStats": [
            {
              $group: {
                _id: "$shippingAddress.city",
                count: { $sum: 1 },
                totalAmount: { $sum: "$grandTotal" }
              }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: report[0]
    });

  } catch (error) {
    next(error);
  }
};

// DOWNLOAD Excel (Detailed Multi-Sheet)
exports.downloadDetailedExcel = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      status: { $nin: ["cancelled"] } 
    }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();

    // --- SHEET 1: Master Sales Data ---
    const sheet1 = workbook.addWorksheet("All Orders");
    sheet1.columns = [
      { header: "Order ID", key: "oid", width: 15 },
      { header: "Date", key: "date", width: 12 },
      { header: "Customer", key: "cust", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Address", key: "addr", width: 30 },
      { header: "Status", key: "status", width: 12 },
      { header: "Pay Method", key: "pm", width: 12 },
      { header: "Product Qty", key: "qty", width: 10 },
      { header: "Subtotal", key: "sub", width: 12 },
      { header: "Delivery Fee", key: "ship", width: 12 },
      { header: "Discount", key: "disc", width: 12 },
      { header: "Grand Total", key: "total", width: 15 },
    ];

    orders.forEach(o => {
      sheet1.addRow({
        oid: o.orderId,
        date: o.createdAt.toISOString().split('T')[0],
        cust: o.shippingAddress?.fullName,
        phone: o.shippingAddress?.phone?.number || o.shippingAddress?.phone, // Handle object/string
        addr: `${o.shippingAddress?.area}, ${o.shippingAddress?.city}`,
        status: o.status.toUpperCase(),
        pm: o.paymentMethod.toUpperCase(),
        qty: o.items.reduce((acc, i) => acc + i.quantity, 0),
        sub: o.subTotal,
        ship: o.shippingFee,
        disc: o.discount,
        total: o.grandTotal
      });
    });

    // --- SHEET 2: Courier Reconciliation (Settlement) ---
    const sheet2 = workbook.addWorksheet("Courier Settlement");
    sheet2.columns = [
      { header: "Order ID", key: "oid", width: 15 },
      { header: "Courier", key: "prov", width: 15 },
      { header: "Tracking ID", key: "track", width: 15 },
      { header: "Order Amount", key: "amt", width: 15 },
      { header: "Settled?", key: "isSet", width: 10 },
      { header: "Amount Received", key: "rec", width: 15 },
      { header: "Due Amount", key: "due", width: 15 },
      { header: "Txn ID", key: "txn", width: 15 },
      { header: "Settlement Date", key: "sdate", width: 15 },
    ];

    orders.filter(o => o.paymentMethod === 'cod').forEach(o => {
      const received = o.courierSettlement?.amountReceived || 0;
      const due = o.grandTotal - received;
      
      const row = sheet2.addRow({
        oid: o.orderId,
        prov: o.courier?.provider || "N/A",
        track: o.courier?.trackingId || "-",
        amt: o.grandTotal,
        isSet: o.courierSettlement?.isSettled ? "YES" : "NO",
        rec: received,
        due: due > 0 ? due : 0,
        txn: o.courierSettlement?.transactionId || "-",
        sdate: o.courierSettlement?.date ? o.courierSettlement.date.toISOString().split('T')[0] : "-"
      });

      // Highlight Due Amount in Red if not settled
      if (!o.courierSettlement?.isSettled) {
        row.getCell('due').font = { color: { argb: 'FFFF0000' }, bold: true };
      }
    });

    // Response Headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Comprehensive_Report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};


// GET Stock Analytics (Advanced Variant Support)
exports.getStockReport = async (req, res, next) => {
  try {
    const lowStockThreshold = 5;

    const report = await Product.aggregate([
      // 1. Calculate Real Stock & Value (Handling Variants)
      {
        $addFields: {
          // যদি ভেরিয়েন্ট থাকে, তবে ভেরিয়েন্টের স্টক যোগ করো, না হলে মেইন স্টক নাও
          currentStock: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              then: { $sum: "$variants.stock" },
              else: { $ifNull: ["$stock", 0] }
            }
          },
          // ভ্যালুয়েশন: (ভেরিয়েন্ট থাকলে তাদের দাম * স্টক) অথবা (মেইন দাম * স্টক)
          currentValue: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              then: {
                $sum: {
                  $map: {
                    input: "$variants",
                    as: "v",
                    in: { $multiply: [{ $ifNull: ["$$v.price", 0] }, { $ifNull: ["$$v.stock", 0] }] }
                  }
                }
              },
              else: { $multiply: [{ $ifNull: ["$price", 0] }, { $ifNull: ["$stock", 0] }] }
            }
          },
          // SKU ডিসপ্লে লজিক
          displaySku: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              then: "Multiple Variants", // অথবা প্রথম ভেরিয়েন্টের SKU: { $arrayElemAt: ["$variants.sku", 0] }
              else: { $ifNull: ["$sku", "N/A"] }
            }
          }
        }
      },

      // 2. Lookup Category (Join to get Name instead of ID)
      {
        $lookup: {
          from: "categories", // আপনার ডাটাবেসে কালেকশনের নাম চেক করুন (সাধারণত 'categories' হয়)
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      {
        $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true }
      },

      // 3. Generate Facets (Reports)
      {
        $facet: {
          // A. KPI Summary
          "summary": [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStockQuantity: { $sum: "$currentStock" },
                totalStockValue: { $sum: "$currentValue" },
                outOfStock: { $sum: { $cond: [{ $eq: ["$currentStock", 0] }, 1, 0] } },
                lowStock: { 
                  $sum: { 
                    $cond: [
                      { $and: [{ $gt: ["$currentStock", 0] }, { $lte: ["$currentStock", lowStockThreshold] }] }, 
                      1, 
                      0
                    ] 
                  } 
                }
              }
            }
          ],

          // B. Category Wise Stock (Using Name)
          "categoryStats": [
            {
              $group: {
                _id: { $ifNull: ["$categoryDetails.name", "Uncategorized"] }, // নাম ব্যবহার করা হচ্ছে
                count: { $sum: 1 },
                stock: { $sum: "$currentStock" }
              }
            },
            { $sort: { stock: -1 } },
            { $limit: 10 }
          ],

          // C. Top Inventory Items
          "topProducts": [
            { $sort: { currentStock: -1 } },
            { $limit: 20 },
            { 
              $project: { 
                title: 1, 
                sku: "$displaySku", // Calculated SKU
                stock: "$currentStock", // Calculated Stock
                category: { $ifNull: ["$categoryDetails.name", "General"] }, // Category Name
                value: "$currentValue" // Calculated Value
              } 
            }
          ]
        }
      }
    ]);

    const stats = report[0].summary[0] || { 
      totalProducts: 0, totalStockQuantity: 0, totalStockValue: 0, outOfStock: 0, lowStock: 0 
    };

    res.status(200).json({
      success: true,
      data: {
        summary: stats,
        categoryStats: report[0].categoryStats,
        topProducts: report[0].topProducts
      }
    });

  } catch (error) {
    next(error);
  }
};



// DOWNLOAD Stock Excel (Updated with Variant & Category Logic)
exports.downloadStockExcel = async (req, res, next) => {
  try {
    const products = await Product.aggregate([
      // 1. Calculate Real Stock & Value (Same logic as Dashboard)
      {
        $addFields: {
          currentStock: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              then: { $sum: "$variants.stock" },
              else: { $ifNull: ["$stock", 0] }
            }
          },
          currentValue: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              then: {
                $sum: {
                  $map: {
                    input: "$variants",
                    as: "v",
                    in: { $multiply: [{ $ifNull: ["$$v.price", 0] }, { $ifNull: ["$$v.stock", 0] }] }
                  }
                }
              },
              else: { $multiply: [{ $ifNull: ["$price", 0] }, { $ifNull: ["$stock", 0] }] }
            }
          },
          displaySku: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
              then: "Multiple Variants", 
              else: { $ifNull: ["$sku", "N/A"] }
            }
          }
        }
      },

      // 2. Lookup Category (Get Name)
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      {
        $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true }
      },

      // 3. Sort by Lowest Stock
      { $sort: { currentStock: 1 } }
    ]);

    // --- Excel Generation Logic ---
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventory Report");

    // Define Columns
    worksheet.columns = [
      { header: "Product Name", key: "name", width: 30 },
      { header: "SKU", key: "sku", width: 20 },
      { header: "Category", key: "cat", width: 20 }, // Now Name
      { header: "Current Stock", key: "stock", width: 15 }, // Calculated Stock
      { header: "Valuation (BDT)", key: "val", width: 20 }, // Calculated Value
      { header: "Status", key: "status", width: 15 },
    ];

    // Styling Header
    worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Dark header

    // Add Rows
    products.forEach(p => {
      let status = "In Stock";
      if (p.currentStock === 0) status = "OUT OF STOCK";
      else if (p.currentStock <= 5) status = "LOW STOCK";

      // Category Name Handling
      const catName = p.categoryDetails ? p.categoryDetails.name : "Uncategorized";

      const row = worksheet.addRow({
        name: p.title,
        sku: p.displaySku,
        cat: catName, // ✅ Correct Category Name
        stock: p.currentStock, // ✅ Correct Total Stock
        val: p.currentValue, // ✅ Correct Valuation
        status: status
      });

      // Conditional Formatting
      const statusCell = row.getCell('status');
      if (p.currentStock === 0) {
        statusCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEB' } };
      } else if (p.currentStock <= 5) {
        statusCell.font = { color: { argb: 'FFFFA500' }, bold: true }; // Orange
      } else {
        statusCell.font = { color: { argb: 'FF10B981' }, bold: true }; // Green
      }
    });

    // Send Response
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Inventory_Report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};



// GET Order Analytics
exports.getOrderReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const report = await Order.aggregate([
      { 
        $match: { createdAt: { $gte: start, $lte: end } } 
      },
      {
        $facet: {
          // 1. Status Breakdown (Pie Chart Data)
          "statusStats": [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                value: { $sum: "$grandTotal" }
              }
            }
          ],

          // 2. Daily Order Volume (Bar Chart Data)
          "dailyStats": [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                orders: { $sum: 1 },
                delivered: { 
                  $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } 
                },
                cancelled: { 
                  $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } 
                }
              }
            },
            { $sort: { _id: 1 } }
          ],

          // 3. Overall Summary
          "summary": [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalDelivered: { 
                  $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } 
                },
                totalCancelled: { 
                  $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } 
                },
                totalReturned: { 
                  $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } 
                },
                totalRevenue: { $sum: "$grandTotal" }
              }
            }
          ]
        }
      }
    ]);

    const stats = report[0].summary[0] || { 
      totalOrders: 0, totalDelivered: 0, totalCancelled: 0, totalReturned: 0, totalRevenue: 0 
    };

    // Calculate Rates
    const deliveryRate = stats.totalOrders > 0 ? ((stats.totalDelivered / stats.totalOrders) * 100).toFixed(1) : 0;
    const cancellationRate = stats.totalOrders > 0 ? ((stats.totalCancelled / stats.totalOrders) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: { ...stats, deliveryRate, cancellationRate },
        statusStats: report[0].statusStats,
        dailyStats: report[0].dailyStats
      }
    });

  } catch (error) {
    next(error);
  }
};


// DOWNLOAD Order Report Excel
exports.downloadOrderReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Order Report");

    // Define Columns
    worksheet.columns = [
      { header: "Order ID", key: "oid", width: 15 },
      { header: "Date", key: "date", width: 12 },
      { header: "Customer Name", key: "name", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Amount (BDT)", key: "amount", width: 15 },
      { header: "Order Status", key: "status", width: 15 },
      { header: "Payment Status", key: "payStatus", width: 15 },
      { header: "Payment Method", key: "payMethod", width: 15 },
    ];

    // Style Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate

    // Add Data
    orders.forEach(order => {
      const row = worksheet.addRow({
        oid: order.orderId,
        date: order.createdAt.toISOString().split('T')[0],
        name: order.shippingAddress?.fullName || "Guest",
        phone: typeof order.shippingAddress?.phone === 'string' 
          ? order.shippingAddress.phone 
          : order.shippingAddress?.phone?.number || "N/A",
        amount: order.grandTotal,
        status: order.status.toUpperCase(),
        payStatus: order.paymentStatus.toUpperCase(),
        payMethod: order.paymentMethod.toUpperCase()
      });

      // Conditional Formatting for Status
      const statusCell = row.getCell('status');
      if (order.status === 'delivered') statusCell.font = { color: { argb: 'FF10B981' }, bold: true }; // Green
      else if (order.status === 'cancelled') statusCell.font = { color: { argb: 'FFEF4444' }, bold: true }; // Red
      else if (order.status === 'returned') statusCell.font = { color: { argb: 'FFF97316' }, bold: true }; // Orange
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Order_Report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};


