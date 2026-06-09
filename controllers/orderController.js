const supabase = require("../config/supabase");
const {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
} = require("../utils/email");

// ── Generate human-readable order ID ────────────────────────────────────────
const generateOrderId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `WE-${dateStr}-${random}`;
};

// ── Generate unique Flutterwave tx_ref ───────────────────────────────────────
const generateTxRef = (orderId) => {
  return `WESTEND-${orderId}-${Date.now()}`;
};

// ── POST /api/orders ─────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    console.log(
      "Received order request body:",
      JSON.stringify(req.body, null, 2),
    );
    console.log(
      "Total amount type:",
      typeof req.body.total_amount,
      "value:",
      req.body.total_amount,
    );
    const {
      customer_name,
      customer_email,
      customer_phone,
      order_items,
      total_amount,
      payment_method,
      pickup_type,
      delivery_address,
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_phone) {
      return res
        .status(400)
        .json({ success: false, message: "Customer details are required" });
    }

    if (!order_items || order_items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Order must have at least one item" });
    }

    if (!total_amount || total_amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order amount" });
    }

    // Verify prices against DB to prevent tampering
    const itemIds = order_items.map((i) => i.id);
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, price, available")
      .in("id", itemIds);

    // Check all items exist and are available
    for (const orderItem of order_items) {
      const menuItem = menuItems?.find((m) => m.id === orderItem.id);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Item "${orderItem.name}" not found`,
        });
      }
      if (!menuItem.available) {
        return res.status(400).json({
          success: false,
          message: `"${menuItem.name}" is currently unavailable`,
        });
      }
    }

    // Recalculate total server-side to prevent price manipulation
    const serverTotal = order_items.reduce((sum, item) => {
      const menuItem = menuItems.find((m) => m.id === item.id);
      return sum + menuItem.price * item.quantity;
    }, 0);

    if (serverTotal !== total_amount) {
      return res.status(400).json({
        success: false,
        message: "Order total mismatch. Please refresh and try again.",
      });
    }

    const order_id = generateOrderId();
    const tx_ref = generateTxRef(order_id);

    // Build enriched order items with server-verified prices
    const enrichedItems = order_items.map((item) => {
      const menuItem = menuItems.find((m) => m.id === item.id);
      return {
        id: item.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
      };
    });

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        order_id,
        tx_ref,
        customer_name: customer_name.trim(),
        customer_email: customer_email.toLowerCase().trim(),
        customer_phone: customer_phone.trim(),
        order_items: enrichedItems,
        total_amount: serverTotal,
        status: "pending",
        payment_status: "pending",
        payment_method: payment_method || "card",
        pickup_type: pickup_type || "pickup",
        delivery_address: delivery_address || null,
        user_id: req.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create order error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create order" });
    }

    // After order is created
    await sendOrderConfirmation(order);

    res.status(201).json({
      success: true,
      message: "Order created",
      data: {
        order_id: order.order_id,
        id: order.id,
        tx_ref: order.tx_ref,
        total_amount: order.total_amount,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/orders/:orderId ─────────────────────────────────────────────────
const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("🔍 Looking for order:", orderId);

    // Try multiple search methods
    let order = null;
    let error = null;

    // Method 1: Search by order_id (string like WE-20260609-5973)
    const { data: orderByOrderId, error: error1 } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (orderByOrderId) {
      order = orderByOrderId;
    } else {
      // Method 2: Search by id (UUID)
      const { data: orderById, error: error2 } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (orderById) {
        order = orderById;
      }
    }

    if (!order) {
      console.log("❌ Order not found with ID:", orderId);
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    console.log("✅ Order found:", order.order_id);
    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET /api/orders/admin/all ────────────────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch orders" });
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── PUT /api/orders/:orderId/status ──────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "paid",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (error || !order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Send email notification for key status changes
    try {
      await sendOrderStatusUpdate(order, status);
    } catch (emailError) {
      console.error("Email send failed (non-critical):", emailError.message);
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete order (admin only)
const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
};
