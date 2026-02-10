const express = require("express");
const router = express.Router();
const { 
  createCustomer, 
  getAllCustomers, 
  getCustomerById, 
  updateCustomer, 
  deleteCustomer 
} = require("../controller/customerController");

const { verifyToken, checkPermission } = require("../middlewares/authMiddleware");

// ১. অথেন্টিকেশন (লগইন করা বাধ্যতামূলক)
router.use(verifyToken);

// ২. রাউটস (Strict Permission Mapping)

router.route("/")
  .get(
      checkPermission("customer.view"), // কাস্টমার লিস্ট দেখার পারমিশন
      getAllCustomers
  )
  .post(
      checkPermission("customer.create"), // নতুন কাস্টমার তৈরির পারমিশন
      createCustomer
  );

router.route("/:id")
  .get(
      checkPermission("customer.view"), // নির্দিষ্ট কাস্টমার দেখার পারমিশন
      getCustomerById
  )
  .put(
      checkPermission("customer.edit"), // কাস্টমার এডিট/ব্যান করার পারমিশন
      updateCustomer
  )
  .delete(
      checkPermission("customer.delete"), // কাস্টমার ডিলিট করার পারমিশন
      deleteCustomer
  );

module.exports = router;