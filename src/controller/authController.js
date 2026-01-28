const User = require("../models/User");
const Otp = require("../models/Otp");
const createError = require("http-errors"); // এরর হ্যান্ডলিং লাইব্রেরি
const jwt = require("jsonwebtoken");
const { secretKey, accessTokenExpiration, refreshTokenExpiration } = require("../secret");


exports.registerUser = async (req, res, next) => {
  try {
    const { fullName, email, countryCode = "+880", phoneNumber, password } = req.body;

    // ১. ডাটাবেসে চেক করি এই নাম্বারে ইউজার আছে কিনা
    // আমরা CountryCode এবং Number দুটো দিয়েই খুঁজব, কারণ মডেলের ইনডেক্স ওভাবেই করা
    console.log("Checking existing user for:", req.body);

    let user = await User.findOne({ 
      "phone.countryCode": countryCode, 
      "phone.number": phoneNumber 
    });

    // কেইস A: ইউজার আছে এবং ফোন ভেরিফাইড (মানে সে অলরেডি রেজিস্টার্ড)
    if (user && user.isPhoneVerified) {
      throw createError(409, "This phone number is already registered. Please login.");
    }

    // কেইস B & C: ইউজার নেই অথবা আছে কিন্তু ভেরিফাই করেনি
    if (user) {
      // ইউজার আগে ট্রাই করেছিল, তাই তথ্য আপডেট করব
      user.name = fullName;
      // ইমেইল ফাঁকা স্ট্রিং হলে undefined করে দিব, যাতে sparse index কাজ করে
      user.email = email === "" ? undefined : email;
      user.password = password; // মডেলের pre-save হুক এটাকে হ্যাশ করে নিবে
    } else {
      // একদম নতুন ইউজার তৈরি
      user = new User({
        name: fullName,
        email: email === "" ? undefined : email,
        phone: { 
            countryCode: countryCode, 
            number: phoneNumber 
        },
        password, 
      });
    }

    // ডাটাবেসে সেভ (Create বা Update)
    await user.save();

    // ২. OTP জেনারেট
    const fullPhone = `${countryCode}${phoneNumber}`;
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

    // ৩. আগের OTP ডিলিট করে নতুনটা সেভ করা
    await Otp.deleteMany({ phone: fullPhone });
    
    await Otp.create({ 
      phone: fullPhone, 
      otp: otpCode,
      expireAt: new Date(Date.now() + 5 * 60 * 1000) // ৫ মিনিট মেয়াদ
    });

    // TODO: SMS Gateway API Call here
    console.log(`>>> OTP sent to ${fullPhone}: ${otpCode} <<<`);

    // ৪. রেসপন্স পাঠানো
    res.status(200).json({
      success: true,
      message: "Registration successful! Please verify OTP.",
      data: {
        userId: user._id,
        phone: fullPhone,
        countryCode: countryCode,
        number: phoneNumber
      }
    });

  } catch (error) {
    // MongoDB ডুপ্লিকেট ইমেইল হ্যান্ডলিং (Error Code 11000)
    if (error.code === 11000 && error.keyPattern.email) {
      return next(createError(409, "Email is already in use by another account."));
    }

    // অন্যান্য সব এরর গ্লোবাল হ্যান্ডলারে পাঠানো
    next(error);
  }
};


exports.verifyOtp = async (req, res, next) => {
  try {
    const { countryCode = "+880", phoneNumber, otp } = req.body;
    const fullPhone = `${countryCode}${phoneNumber}`;

    // ১. OTP এবং ইউজার চেক (আগের মতোই)
    const otpRecord = await Otp.findOne({ phone: fullPhone });
    if (!otpRecord) throw createError(400, "Invalid request or OTP expired.");
    if (otpRecord.otp !== otp) throw createError(400, "Invalid OTP.");
    if (otpRecord.expireAt < Date.now()) {
      await Otp.deleteOne({ phone: fullPhone });
      throw createError(400, "OTP expired.");
    }

    const user = await User.findOne({ "phone.countryCode": countryCode, "phone.number": phoneNumber });
    if (!user) throw createError(404, "User not found.");

    // ২. ইউজার ভেরিফাইড করা
    user.isPhoneVerified = true;
    user.status = "active";
    await user.save();
    
    await Otp.deleteMany({ phone: fullPhone });

    // ৩. টোকেন জেনারেট (Payload: id & role)
    const payload = { _id: user._id, role: user.role };

    // Access Token (Short lived: 15m)
    const accessToken = jwt.sign(payload, secretKey, { 
      expiresIn: accessTokenExpiration 
    });

    // Refresh Token (Long lived: 7d)
    const refreshToken = jwt.sign(payload, secretKey, {
      expiresIn: refreshTokenExpiration 
    });

    // ৪. Refresh Token টি কুকিতে সেট করা (Best Practice for Security)
    // এটি হ্যাকারদের XSS অ্যাটাক থেকে বাঁচায়
    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      httpOnly: true, // জাভাস্ক্রিপ্ট দিয়ে এক্সেস করা যাবে না
      secure: false, // প্রোডাকশনে https হতে হবে
      sameSite: "strict",
    });

    // ৫. রেসপন্স পাঠানো
    res.status(200).json({
      success: true,
      message: "Phone verification successful!",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar
        },
        token: {
          accessToken,  // ফ্রন্টএন্ড এটি মেমোরিতে বা ছোট সময়ের জন্য রাখবে
          refreshToken, // মোবাইলের জন্য বডিতেও পাঠালাম, ওয়েবের জন্য কুকি আছে
        }
      },
    });

  } catch (error) {
    next(error);
  }
};