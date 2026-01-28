// src/middlewares/validateRequest.js

exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      next();
    } else {
      const errorMessages = result.error.issues.map((err) => ({
        path: err.path[0],
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: errorMessages,
      });
    }
  };
};
