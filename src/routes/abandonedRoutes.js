const express = require("express");
const router = express.Router();
const { syncAbandonedCheckout } = require("../controller/abandonedController");
const { verifyToken } = require("../middlewares/authMiddleware");

const optionalVerifyToken = (req, res, next) => {
    if (req.headers.authorization) verifyToken(req, res, next);
    else next();
};

router.post("/sync", optionalVerifyToken, syncAbandonedCheckout);
module.exports = router;