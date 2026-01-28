const express = require("express");
// const { testController } = require("../controller/testController");
const { validateRequest } = require("../middlewares/validateRequest");
const { registerSchema, verifyOtpSchema } = require("../validators/authValidator");
const { registerUser, verifyOtp } = require("../controller/authController");
const router = express.Router();

router.post("/register", validateRequest(registerSchema), registerUser);
router.post("/verify-otp", validateRequest(verifyOtpSchema), verifyOtp);



module.exports = router;