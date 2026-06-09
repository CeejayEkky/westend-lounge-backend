const jwt = require('jsonwebtoken')
const supabase = require('../config/supabase')

// ── Verify JWT token ─────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Fetch fresh user from DB
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, is_active')
      .eq('id', decoded.id)
      .single()

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account deactivated' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired, please login again' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// ── Admin only ───────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  next()
}

// ── Optional auth — attaches user if token present, continues either way ─────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next() // no token — continue as guest
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone, role')
      .eq('id', decoded.id)
      .single()
    req.user = user || null
  } catch {
    req.user = null
  }
  next()
}

module.exports = { protect, adminOnly, optionalAuth }