const express = require("express");
const http = require("http"); // 🔥 ১. http ইমপোর্ট করুন
const { Server } = require("socket.io"); // 🔥 ২. Socket.io ইমপোর্ট করুন
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const createError = require("http-errors");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { port } = require("./src/secret");
const { connectToDatabase } = require("./src/services/database");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

const apiRoutes = require("./src/routes");

// Seeder Imports
const seedSuperAdmin = require("./src/seeders/adminSeeder");
const seedRoles = require("./src/seeders/roleSeeder");

const app = express();
const server = http.createServer(app); // 🔥 ৩. এক্সপ্রেস অ্যাপকে সার্ভারে রূপান্তর

// 🔥 ৪. Socket.io ইনিশিয়েলাইজেশন
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  },
});

// 🔥 ৫. গ্লোবাল অবজেক্ট হিসেবে সেট করা (যাতে অন্য ফাইল থেকে নোটিফিকেশন পাঠানো যায়)
global.io = io;

io.on("connection", (socket) => {
  console.log(`🔌 Admin Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log("❌ Admin Disconnected");
  });
});

const bootstrapApp = async () => {
  try {
    // 1. Logging
    app.use(morgan("dev"));

    // 2. Security Middleware
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(
      cors({
        origin: [process.env.FRONTEND_URL],
        credentials: true,
      })
    );

    // 3. Body Parsers
    app.use(express.json());
    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // 4. Sanitize Data
    app.use(mongoSanitize());

    // 5. Swagger Documentation
    app.use("/doc", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // 6. Normal Routes
    app.get("/", (req, res) => {
      res.send("E-Commerce API with Real-time Notifications is running");
    });

    // 6. API Routes
    app.use("/api/v1", apiRoutes);

    // 7. Client Error Handling (404)
    app.use((req, res, next) => {
      next(createError(404, "Route not found"));
    });

    // 8. Server Error Handling (Global)
    app.use((err, req, res, next) => {
      return res.status(err.status || 500).json({
        success: false,
        errors: { message: err.message || "Internal Server Error" },
      });
    });

    // Database connect hobar por server start hobe
    await connectToDatabase();

    // Database Seeding (প্রয়োজনে আন-কমেন্ট করুন)
    // await seedSuperAdmin();
    // await seedRoles();

    // 🔥 ৬. app.listen এর বদলে server.listen ব্যবহার করুন
    server.listen(port, () => {
      console.log(`🚀 Server running on port: ${port}`);
      console.log(`🔌 Socket.io is ready for real-time notifications`);
      console.log(`Swagger Docs: http://localhost:${port}/doc`);
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

bootstrapApp();