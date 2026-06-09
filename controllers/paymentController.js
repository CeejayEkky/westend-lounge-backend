const axios = require("axios");
const supabase = require("../config/supabase");
const { sendOrderConfirmation } = require("../utils/email");

// ── POST /api/payments/verify ────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    let { transaction_id, tx_ref, order_id } = req.body;

    if (!transaction_id || !tx_ref) {
      return res.status(400).json({
        success: false,
        message: "transaction_id and tx_ref are required",
      });
    }

    // ✅ If order_id not provided, find it using tx_ref
    if (!order_id) {
      const { data: orderByTxRef } = await supabase
        .from("orders")
        .select("order_id")
        .eq("tx_ref", tx_ref)
        .single();
      
      if (orderByTxRef) {
        order_id = orderByTxRef.order_id;
      }
    }

    // Fetch the order first
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Check if already verified (prevent double processing)
    if (order.payment_status === "success") {
      return res.json({
        success: true,
        message: "Payment already verified",
        data: {
          order_id: order.order_id,
          status: order.status,
          payment_status: order.payment_status,
        },
      });
    }

    // Verify with Flutterwave API
    const flwResponse = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const flwData = flwResponse.data?.data;

    // Validate the response
    if (
      flwData.status !== "successful" ||
      flwData.tx_ref !== tx_ref ||
      flwData.amount < order.total_amount ||
      flwData.currency !== "NGN"
    ) {
      // Log failed verification
      await supabase.from("payments").insert({
        order_id: order.id,
        tx_ref,
        flw_transaction_id: String(transaction_id),
        amount: flwData?.amount || 0,
        status: "failed",
        payment_method: flwData?.payment_type,
        customer_email: order.customer_email,
        flw_response: flwData,
      });

      return res.status(400).json({ 
        success: false, 
        message: "Payment verification failed" 
      });
    }

    // ✅ Payment is genuine — update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "success",
        status: "paid",
        flw_transaction_id: String(transaction_id),
      })
      .eq("id", order.id)
      .select()
      .single();

    if (updateError) {
      console.error("Order update error:", updateError);
      return res.status(500).json({
        success: false,
        message: "Payment verified but order update failed",
      });
    }

    // Log successful payment
    await supabase.from("payments").insert({
      order_id: order.id,
      tx_ref,
      flw_transaction_id: String(transaction_id),
      amount: flwData.amount,
      status: "success",
      payment_method: flwData.payment_type,
      customer_email: order.customer_email,
      flw_response: flwData,
      verified_at: new Date().toISOString(),
    });

    // Send confirmation email
    try {
      await sendOrderConfirmation(updatedOrder);
    } catch (emailError) {
      console.error("Confirmation email failed (non-critical):", emailError.message);
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        order_id: updatedOrder.order_id,
        status: updatedOrder.status,
        payment_status: updatedOrder.payment_status,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Payment verification failed. Please contact support.",
    });
  }
};

// ── POST /api/payments/webhook ────────────────────────────────────────────────
const webhook = async (req, res) => {
  try {
    const secretHash = process.env.FLW_WEBHOOK_SECRET;
    const signature = req.headers["verif-hash"];

    // Verify webhook signature
    if (secretHash && signature !== secretHash) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const payload = req.body;

    if (payload.event === "charge.completed" && payload.data.status === "successful") {
      const { tx_ref, id: transaction_id, amount, currency } = payload.data;

      // Find the order
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("tx_ref", tx_ref)
        .single();

      if (!order || order.payment_status === "success") {
        return res.sendStatus(200);
      }

      if (amount >= order.total_amount && currency === "NGN") {
        // Update order
        const { data: updatedOrder } = await supabase
          .from("orders")
          .update({
            payment_status: "success",
            status: "paid",
            flw_transaction_id: String(transaction_id),
          })
          .eq("id", order.id)
          .select()
          .single();

        // Log payment
        await supabase.from("payments").insert({
          order_id: order.id,
          tx_ref,
          flw_transaction_id: String(transaction_id),
          amount,
          status: "success",
          payment_method: payload.data.payment_type,
          customer_email: order.customer_email,
          flw_response: payload.data,
          verified_at: new Date().toISOString(),
        });

        // Send confirmation email
        try {
          await sendOrderConfirmation(updatedOrder);
        } catch (e) {
          console.error("Webhook email error:", e.message);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(200);
  }
};

// ✅ Add this new endpoint to manually check payment status
const checkPaymentStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", order_id)
      .single();
    
    if (error || !order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    res.json({
      success: true,
      data: {
        order_id: order.order_id,
        status: order.status,
        payment_status: order.payment_status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { verifyPayment, webhook, checkPaymentStatus };