const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// ── Generate JWT ─────────────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters",
        });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists",
        });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        phone: phone.trim(),
        role: "customer",
      })
      .select("id, name, email, phone, role")
      .single();

    if (error) {
      console.error("Register error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create account" });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isAdmin: user.role === "admin",
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt for email:", email);

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // Fetch user with password hash
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, phone, role, password_hash, is_active")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !user) {
      console.log("❌ User not found:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    console.log("✅ User found:", user.email, "Role:", user.role);
    console.log("📝 Password hash from DB:", user.password_hash);

    if (!user.is_active) {
      console.log("❌ Account deactivated:", email);
      return res
        .status(401)
        .json({ success: false, message: "Account has been deactivated" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("🔑 Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ Invalid password for:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user.id);
    console.log("✅ Login successful for:", email);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isAdmin: user.role === "admin",
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res) => {
  // JWT is stateless — client removes the token
  // This endpoint exists for consistency and future token blacklisting
  res.json({ success: true, message: "Logged out successfully" });
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      isAdmin: req.user.role === "admin",
    },
  });
};

module.exports = { register, login, logout, getMe };
