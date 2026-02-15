const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const AbandonedCheckout = require("../models/AbandonedCheckout");
const Role = require("../models/Role"); 

exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ১. এডমিন রোলের ID বের করা (User Filtering এর জন্য)
    const adminRoles = await Role.find({ 
        slug: { $in: ["admin", "super_admin", "manager", "staff"] } 
    }).select("_id");
    const adminRoleIds = adminRoles.map(r => r._id);

    // ২. প্যারালাল ডাটা ফেচিং
    const [
      totalRevenue,
      totalOrders,
      activeCustomers,
      pendingOrders,
      lowStockProducts,
      potentialLost
    ] = await Promise.all([
      
      // A. Total Revenue (Only Paid)
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } }
      ]),
      
      // B. Total Orders
      Order.countDocuments(),
      
      // C. Active Customers
      User.countDocuments({ role: { $nin: adminRoleIds } }), 
      
      // D. Pending Orders
      Order.countDocuments({ status: "pending" }),
      
      // E. Low Stock (Variants Included)
      Product.countDocuments({
        $or: [
            { stock: { $lt: 5 } }, 
            { "variants.stock": { $lt: 5 } } 
        ]
      }),
      
      // F. 🔥 Potential Lost (Fixed Calculation Logic)
      AbandonedCheckout.aggregate([
        // ১. শুধু যেগুলো রিকভার হয়নি সেগুলো নাও
        { $match: { isRecovered: false } },
        
        // ২. আইটেমগুলোকে আলাদা ডকুমেন্ট বানাও (Unwind)
        { $unwind: "$items" },

        // ৩. প্রোডাক্টের বর্তমান প্রাইস জানার জন্য প্রোডাক্ট কালেকশন এর সাথে জয়েন করো
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "productData"
            }
        },

        // ৪. প্রোডাক্ট ডাটা অ্যারে থেকে অবজেক্টে নাও
        { $unwind: { path: "$productData", preserveNullAndEmptyArrays: true } },

        // ৫. প্রতিটি আইটেমের টোটাল বের করো
        {
            $project: {
                lineTotal: {
                    $multiply: [
                        // Quantity (যদি না থাকে তবে 1)
                        { $ifNull: ["$items.quantity", 1] }, 
                        
                        // Price Logic: 
                        // যদি আইটেমের নিজস্ব প্রাইস থাকে > সেটা নাও
                        // না থাকলে > প্রোডাক্টের মেইন প্রাইস নাও
                        // তাও না থাকলে > 0
                        {
                            $cond: {
                                if: { $gt: ["$items.price", 0] },
                                then: "$items.price",
                                else: { $ifNull: ["$productData.price", 0] }
                            }
                        }
                    ]
                }
            }
        },

        // ৬. সব লাইন টোটাল যোগ করো
        {
            $group: {
                _id: null,
                total: { $sum: "$lineTotal" }
            }
        }
      ])
    ]);

    // ৩. সেলস চার্ট
    const salesChart = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: last7Days },
          paymentStatus: "paid" 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$grandTotal" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ৪. টপ প্রোডাক্টস
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.total" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // ৫. রিসেন্ট অর্ডারস
    const recentOrders = await Order.find()
      .select("orderId shippingAddress.fullName grandTotal status createdAt paymentStatus")
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      stats: {
        revenue: totalRevenue[0]?.total || 0,
        orders: totalOrders,
        customers: activeCustomers,
        pending: pendingOrders,
        lowStock: lowStockProducts,
        // ✅ Fix: Aggregation result returns an array, pick the first item
        potentialLost: potentialLost.length > 0 ? potentialLost[0].total : 0
      },
      chartData: salesChart,
      topProducts,
      recentOrders
    });

  } catch (error) {
    next(error);
  }
};