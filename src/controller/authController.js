const User = require("../models/User");
const Otp = require("../models/Otp");
const Role = require("../models/Role");
const createError = require("http-errors");
const jwt = require("jsonwebtoken");
const { secretKey, accessTokenExpiration, refreshTokenExpiration } = require("../secret");

// --- 1. REGISTER USER ---
exports.registerUser = async (req, res, next) => {
  // ... (রেজিস্ট্রেশন কোড ঠিক আছে, কোনো চেঞ্জ লাগবে না)
  try {
    const { fullName, email, countryCode = "880", phoneNumber, password } = req.body;

    let user = await User.findOne({ 
      "phone.countryCode": countryCode, 
      "phone.number": phoneNumber 
    });

    if (user && user.isPhoneVerified) {
      throw createError(409, "This phone number is already registered. Please login.");
    }

    const customerRole = await Role.findOne({ slug: "customer" });
    if (!customerRole) {
      throw createError(500, "System Error: Default 'customer' role not found.");
    }

    if (user) {
      user.name = fullName;
      user.email = email === "" ? undefined : email;
      user.password = password; 
      user.role = customerRole._id; 
    } else {
      user = new User({
        name: fullName,
        email: email === "" ? undefined : email,
        phone: { countryCode, number: phoneNumber },
        password,
        role: customerRole._id
      });
    }

    await user.save();

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await Otp.deleteMany({ "phone.countryCode": countryCode, "phone.number": phoneNumber });
    await Otp.create({ phone: { countryCode, number: phoneNumber }, otp: otpCode });

    console.log(`>>> OTP sent to ${countryCode}${phoneNumber}: ${otpCode} <<<`);

    res.status(200).json({
      success: true,
      message: "Registration successful! Please verify OTP.",
      data: {
        userId: user._id,
        phone: { countryCode, number: phoneNumber }
      }
    });

  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      return next(createError(409, "Email is already in use by another account."));
    }
    next(error);
  }
};

// --- 2. VERIFY OTP ---
exports.verifyOtp = async (req, res, next) => {
  try {
    const { countryCode = "880", phoneNumber, otp } = req.body;

    const otpRecord = await Otp.findOne({ 
      "phone.countryCode": countryCode, 
      "phone.number": phoneNumber 
    });

    if (!otpRecord) throw createError(400, "Invalid request or OTP expired.");
    if (otpRecord.otp !== otp) throw createError(400, "Invalid OTP.");
    
    const otpTime = new Date(otpRecord.createdAt).getTime();
    if ((Date.now() - otpTime) > (5 * 60 * 1000)) {
        await Otp.deleteOne({ _id: otpRecord._id });
        throw createError(400, "OTP expired.");
    }

    // 🔥 POPULATE ROLE HERE
    const user = await User.findOne({ 
      "phone.countryCode": countryCode, 
      "phone.number": phoneNumber 
    }).populate("role");

    if (!user) throw createError(404, "User not found.");

    user.isPhoneVerified = true;
    user.status = "active";
    await user.save();
    
    await Otp.deleteMany({ "phone.countryCode": countryCode, "phone.number": phoneNumber });

    const payload = { _id: user._id, role: user.role }; 
    
    const accessToken = jwt.sign(payload, secretKey, { expiresIn: accessTokenExpiration });
    const refreshToken = jwt.sign(payload, secretKey, { expiresIn: refreshTokenExpiration });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      path: "/"
    });

    res.status(200).json({
      success: true,
      message: "Phone verification successful!",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          // ❌ আগে ছিল: role: user.role.slug 
          // ✅ এখন হবে: পুরো অবজেক্ট পাঠানো
          role: user.role, 
          avatar: user.avatar
        },
        token: { accessToken, refreshToken }
      },
    });

  } catch (error) {
    next(error);
  }
};

// --- 3. LOGIN USER (SMART LOGIN) ---
exports.loginUser = async (req, res, next) => {
  try {
    const { email, countryCode = "880", phoneNumber, password } = req.body;

    let user = null;

    if (email) {
      user = await User.findOne({ email }).select("+password").populate("role");
      if (!user) throw createError(404, "Admin/User not found with this email.");
      if (!user.isEmailVerified) throw createError(403, "Email is not verified.");
    } else if (phoneNumber) {
      user = await User.findOne({ 
        "phone.countryCode": countryCode, 
        "phone.number": phoneNumber 
      }).select("+password").populate("role");

      if (!user) throw createError(404, "User not found.");
      if (!user.isPhoneVerified) throw createError(403, "Phone number is not verified.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw createError(401, "Invalid credentials.");

    if (user.status !== "active") {
        throw createError(403, "Your account is suspended or banned.");
    }

    const payload = { 
        _id: user._id, 
        role: user.role 
    };
    
    const accessToken = jwt.sign(payload, secretKey, { expiresIn: accessTokenExpiration });
    const refreshToken = jwt.sign(payload, secretKey, { expiresIn: refreshTokenExpiration });

    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false, 
      sameSite: "strict",
      path:"/"
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          // ❌ আগে ছিল: role: user.role.slug (এটিই সমস্যা ছিল)
          // ✅ এখন হবে: পুরো role অবজেক্ট পাঠানো
          role: user.role, 
          avatar: user.avatar
        },
        token: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    next(error);
  }
};

// ... Logout, ResendOTP, RefreshToken same as before (no changes needed) ...
exports.logoutUser = async (req, res, next) => {
    try {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/" // Logout এও path "/" দেওয়া ভালো
      });
  
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  exports.resendOtp = async (req, res, next) => {
    // ... আপনার আগের কোড ...
    try {
        const { countryCode = "880", phoneNumber } = req.body;

        const user = await User.findOne({ 
            "phone.countryCode": countryCode, 
            "phone.number": phoneNumber 
        });

        if (!user) throw createError(404, "User not found.");
        if (user.isPhoneVerified) throw createError(400, "User is already verified. Please Login.");

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await Otp.deleteMany({ "phone.countryCode": countryCode, "phone.number": phoneNumber });
        await Otp.create({ 
            phone: { countryCode, number: phoneNumber }, 
            otp: otpCode 
        });

        console.log(`>>> Resend OTP to ${countryCode}${phoneNumber}: ${otpCode} <<<`);

        res.status(200).json({
            success: true,
            message: "OTP resent successfully.",
        });

    } catch (error) {
        next(error);
    }
};

exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) throw createError(401, "Refresh token missing.");

        const decoded = jwt.verify(refreshToken, secretKey);
        const user = await User.findById(decoded._id).populate("role");
        if (!user) throw createError(404, "User not found.");

        const payload = { _id: user._id, role: user.role };
        const newAccessToken = jwt.sign(payload, secretKey, { expiresIn: accessTokenExpiration });

        res.status(200).json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (error) {
        next(createError(403, "Invalid or expired refresh token."));
    }
};