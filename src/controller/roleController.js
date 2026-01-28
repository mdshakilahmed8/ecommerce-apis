const Role = require("../models/Role");
const User = require("../models/User"); // User মডেল ইম্পোর্ট করুন
const createError = require("http-errors");
const slugify = require("slugify");

// 1. Create Role
exports.createRole = async (req, res, next) => {
  try {
    const { name, permissions, description } = req.body;

    const slug = slugify(name, { lower: true, strict: true });
    
    const existingRole = await Role.findOne({ slug });
    if (existingRole) {
      throw createError(409, "Role with this name already exists.");
    }

    const role = new Role({
      name,
      slug,
      permissions,
      description,
      // সিস্টেম রোল বাদে বাকি সব ম্যানুয়াল রোল এডিটেবল হবে
      isEditable: true 
    });

    await role.save();

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Roles
exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().select("-__v");
    
    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Single Role
exports.getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) throw createError(404, "Role not found");

    res.status(200).json({
      success: true,
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Role
exports.updateRole = async (req, res, next) => {
  try {
    const { name, permissions, description } = req.body;
    const roleId = req.params.id;

    const role = await Role.findById(roleId);
    if (!role) throw createError(404, "Role not found");

    // Safety Check: System roles cannot be edited
    if (role.isEditable === false) {
      throw createError(403, "This is a system role and cannot be modified.");
    }

    // Name change logic
    if (name && name !== role.name) {
      const newSlug = slugify(name, { lower: true, strict: true });
      const existingRole = await Role.findOne({ slug: newSlug });
      
      if (existingRole && existingRole._id.toString() !== roleId) {
        throw createError(409, "Role with this name already exists.");
      }
      
      role.name = name;
      role.slug = newSlug;
    }

    if (permissions) role.permissions = permissions;
    if (description) role.description = description;

    await role.save();

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Role
exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) throw createError(404, "Role not found");

    // Safety Check 1: System roles cannot be deleted
    if (role.isEditable === false) {
      throw createError(403, "System roles cannot be deleted.");
    }

    // Safety Check 2: কোনো ইউজার এই রোলে থাকলে ডিলিট করা যাবে না
    const userCount = await User.countDocuments({ role: role._id });
    if (userCount > 0) {
      throw createError(400, `Cannot delete role. ${userCount} users are assigned to this role.`);
    }

    await Role.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};