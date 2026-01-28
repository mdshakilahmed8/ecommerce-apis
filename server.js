const express = require("express");
const app = express();
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const createError = require("http-errors");
const morgan = require("morgan");
const cors = require("cors");

const { port } = require("./src/secret");
const { connectToDatabase } = require("./src/services/database");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

const apiRoutes = require("./src/routes")

// Seeder Imports
const seedSuperAdmin = require("./src/seeders/adminSeeder");
const seedRoles = require("./src/seeders/roleSeeder");
//Seeder Imports End

const bootstrapApp = async () => {
  try {
    // 1. Logging (Request console e dekhabe)
    app.use(morgan("dev"));

    // 2. Security Middleware
    app.use(helmet({ contentSecurityPolicy: false })); // Swagger er jonno CSP false rakhlam
    app.use(cors()); // Frontend (React/Vue) theke access er jonno

    // 3. Body Parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // 4. Sanitize Data to prevent NoSQL Injection
    app.use(mongoSanitize());

    // 5. Swagger Documentation
    app.use("/doc", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // 6. Normal Routes
    app.get("/", (req, res) => {
      res.send("E-Commerce API is running");
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

    // await seedSuperAdmin();
    // await seedRoles();

    app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
      console.log(`Swagger Docs: http://localhost:${port}/doc`);
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

bootstrapApp();
