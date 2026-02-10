const express = require("express");
const router = express.Router();
const { 
  getAllGateways, 
  updateGateway 
} = require("../controller/smsGatewayController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// Authentication
router.use(verifyToken);

router.get("/", 
    checkPermission("api.view"), // সেটিংস দেখার পারমিশন
    getAllGateways
);

router.put("/:id", 
    checkPermission("api.edit"), // সেটিংস এডিট করার পারমিশন
    updateGateway
);

module.exports = router;