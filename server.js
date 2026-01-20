const express = require("express");
const app = express();
const helmet = require("helmet");
const mongoSenitize = require("express-mongo-sanitize");

const { port } = require("./src/secret");
const { connectToDatabase } = require("./src/services/database");

const bootstrapApp = async () => {
  try {
    app.use(helmet());
    app.use(express.json());
    app.use(mongoSenitize());

    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    app.get("/", (req, res) => {
      res.send("E-Commerce API is running");
    });

    // Client Error Handling
    app.use((req, res, next) => {
      next(createError(404, "Route not found"));
    });

    //Server error handleing..
    app.use((err, req, res, next) => {
      return res.status(err.status || 500).json({
        success: false,
        errors: {
          ...err?.error,
          message: err?.fieldError === true ? undefined : err?.message,
          fieldError: undefined,
        },
      });
    });

    let server = app.listen(port, () => {
      console.log(`Server is running on port: ${port}`);
    });

    await connectToDatabase();
  } catch (err) {
    console.error(`Error during app bootstrap: ${err.message}`);
    process.exit(1);
  }
};

bootstrapApp();
