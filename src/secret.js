require("dotenv").config();

exports.port = process.env.SERVER_PORT;
exports.secretKey = process.env.JWT_SECRET;
exports.accessTokenExpiration = process.env.ACCESS_TOKEN_EXPIRY;
exports.refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRY;
exports.otpExpireTime = process.env.OTP_EXPIRE_TIME;
exports.passwordSalt = process.env.PASSWORD_SALT;

// Cloudinary Credentials
exports.cloudName = process.env.CLOUD_NAME;
exports.cloudApiKey = process.env.CLOUD_API_KEY;
exports.cloudApiSecret = process.env.CLOUD_API_SECRET;

