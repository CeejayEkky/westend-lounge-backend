const express = require('express')
const router = express.Router()

const { register, login, logout, getMe } = require('../controllers/authController')
const { createOrder, getOrder, getAllOrders, updateOrderStatus, deleteOrder } = require('../controllers/orderController')
const { verifyPayment, webhook, checkPaymentStatus } = require('../controllers/paymentController')
const { getMenu, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController')
const { createReservation, getAllReservations, updateReservationStatus, deleteReservation } = require('../controllers/reservationController')
const { getStats } = require('../controllers/adminController')
const { protect, adminOnly, optionalAuth } = require('../middleware/auth')
const { 
  getAllUsers, 
  updateUserRole, 
  deleteUser, 
  getAdminStats 
} = require('../controllers/adminController');

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/logout', protect, logout)
router.get('/auth/me', protect, getMe)

// ── Menu (public read, admin write) ──────────────────────────────────────────
router.get('/menu', getMenu)
router.get('/menu/:id', getMenuItem)
router.post('/menu', protect, adminOnly, createMenuItem)
router.put('/menu/:id', protect, adminOnly, updateMenuItem)
router.delete('/menu/:id', protect, adminOnly, deleteMenuItem)

// ── Orders ────────────────────────────────────────────────────────────────────
router.post('/orders', optionalAuth, createOrder)           // guest or logged-in
router.get('/orders/admin/all', protect, adminOnly, getAllOrders)
router.get('/orders/:orderId', getOrder)                    // public for tracking
router.put('/orders/:orderId/status', protect, adminOnly, updateOrderStatus)
router.delete('/orders/:orderId', protect, adminOnly, deleteOrder);

// ── Payments ──────────────────────────────────────────────────────────────────
router.post('/payments/verify', verifyPayment)              // called from frontend after FLW callback
router.post('/payments/webhook', webhook) 
router.get('/payments/status/:order_id', checkPaymentStatus);                  // called by Flutterwave server-to-server

// ── Reservations ──────────────────────────────────────────────────────────────
router.post('/reservations', optionalAuth, createReservation)
router.get('/reservations/admin/all', protect, adminOnly, getAllReservations)
router.put('/reservations/:id/status', protect, adminOnly, updateReservationStatus)
router.delete('/reservations/:id', protect, adminOnly, deleteReservation);

// Admin routes
router.get('/admin/stats', protect, adminOnly, getAdminStats);
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.put('/admin/users/:userId/role', protect, adminOnly, updateUserRole);
router.delete('/admin/users/:userId', protect, adminOnly, deleteUser);

module.exports = router