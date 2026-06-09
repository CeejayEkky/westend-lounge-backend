const supabase = require("../config/supabase");

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, phone, role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch users" });
    }

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !["admin", "customer"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", userId)
      .select()
      .single();

    if (error || !user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User role updated", data: user });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow deleting yourself
    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete your own account" });
    }

    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get admin stats (orders, revenue, users, etc.)
// Get admin stats (orders, revenue, users, etc.)
const getAdminStats = async (req, res) => {
  try {
    // Get total orders
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get total revenue from successful payments
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'success');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

    // Get pending orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // ✅ FIXED: Get today's reservations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: todayReservations } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .gte('reservation_date', today.toISOString())
      .lt('reservation_date', tomorrow.toISOString());

    res.json({
      success: true,
      data: {
        totalOrders: totalOrders || 0,
        totalRevenue,
        pendingOrders: pendingOrders || 0,
        todayReservations: todayReservations || 0,
        totalUsers: totalUsers || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllUsers, updateUserRole, deleteUser, getAdminStats };
