// server/utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send reservation confirmation to customer
const sendReservationConfirmation = async (reservation) => {
  try {
    const formattedDate = new Date(reservation.reservation_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = new Date(reservation.reservation_date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    await transporter.sendMail({
      from: `"Westend Lounge" <${process.env.EMAIL_USER}>`,
      to: reservation.customer_email,
      subject: `Reservation Confirmation - Westend Lounge`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
          <h2 style="color: #FFD700;">Thank you for choosing Westend Lounge! 🎉</h2>
          <p>Dear <strong>${reservation.customer_name}</strong>,</p>
          <p>Your table has been successfully reserved. Here are your reservation details:</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p><strong>📅 Date:</strong> ${formattedDate}</p>
            <p><strong>⏰ Time:</strong> ${formattedTime}</p>
            <p><strong>👥 Guests:</strong> ${reservation.guests}</p>
            <p><strong>📍 Location:</strong> 139 Akowonjo Road, Alimosho, Lagos</p>
            ${reservation.special_requests ? `<p><strong>📝 Special Requests:</strong> ${reservation.special_requests}</p>` : ''}
          </div>
          
          <p><strong>Important Information:</strong></p>
          <ul>
            <li>Please arrive 10 minutes before your reservation time</li>
            <li>We'll hold your table for 15 minutes past the reservation time</li>
            <li>Free parking available for customers</li>
            <li>Live band starts at 8 PM on Fridays & Saturdays</li>
          </ul>
          
          <p>To cancel or modify your reservation, please contact us at +234 803 722 7263.</p>
          
          <br/>
          <p>We look forward to serving you!</p>
          <p><strong>Westend Lounge Team</strong> ❤️</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">139 Akowonjo Road, Alimosho, Lagos | +234 803 722 7263</p>
        </div>
      `,
    });
    console.log(`✅ Reservation confirmation sent to ${reservation.customer_email}`);
  } catch (error) {
    console.error('❌ Reservation confirmation email failed:', error.message);
  }
};

// Send order confirmation to customer
const sendOrderConfirmation = async (order) => {
  try {
    const itemsList = order.order_items.map(item => 
      `${item.name} x ${item.quantity} - ₦${(item.price * item.quantity).toLocaleString()}`
    ).join('\n');

    await transporter.sendMail({
      from: `"Westend Lounge" <${process.env.EMAIL_USER}>`,
      to: order.customer_email,
      subject: `Order Confirmation #${order.order_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Thank you for your order, ${order.customer_name}!</h2>
          <p>Your order <strong>#${order.order_id}</strong> has been received.</p>
          <h3>Order Details:</h3>
          <ul>
            ${order.order_items.map(item => `<li>${item.name} x ${item.quantity} - ₦${(item.price * item.quantity).toLocaleString()}</li>`).join('')}
          </ul>
          <p><strong>Total:</strong> ₦${order.total_amount.toLocaleString()}</p>
          <p>Track your order here: <a href="${process.env.FRONTEND_URL}/track-order/${order.order_id}">Track Order</a></p>
          <p>We'll notify you when your order is ready.</p>
          <br/>
          <p>Westend Lounge – 139 Akowonjo Road, Lagos</p>
        </div>
      `,
    });
    console.log(`✅ Order confirmation sent to ${order.customer_email}`);
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
  }
};

// Send order status update to customer
const sendOrderStatusUpdate = async (order, newStatus) => {
  try {
    let statusMessage = '';
    switch(newStatus) {
      case 'preparing':
        statusMessage = 'Your order is being prepared by our chefs! 🔥';
        break;
      case 'ready':
        statusMessage = 'Your order is ready for pickup! 🎉';
        break;
      case 'completed':
        statusMessage = 'Order completed! Thank you for choosing Westend! ❤️';
        break;
      case 'cancelled':
        statusMessage = 'Your order has been cancelled.';
        break;
      default:
        statusMessage = `Your order status is now: ${newStatus}`;
    }
    
    await transporter.sendMail({
      from: `"Westend Lounge" <${process.env.EMAIL_USER}>`,
      to: order.customer_email,
      subject: `Order Update #${order.order_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Hello ${order.customer_name}!</h2>
          <p>${statusMessage}</p>
          <p>Track your order: <a href="${process.env.FRONTEND_URL}/track-order/${order.order_id}">Click here</a></p>
          <br/>
          <p>Westend Lounge – 139 Akowonjo Road, Lagos</p>
        </div>
      `,
    });
    console.log(`✅ Status update sent to ${order.customer_email}`);
  } catch (error) {
    console.error('❌ Status email failed:', error.message);
  }
};

// Send admin notification for new reservation
const sendAdminReservationAlert = async (reservation) => {
  try {
    const formattedDate = new Date(reservation.reservation_date).toLocaleString();
    
    await transporter.sendMail({
      from: `"Westend Lounge" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'admin@westendloungebar.com',
      subject: '🆕 New Table Reservation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #FFD700;">New Reservation Alert! 🆕</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 15px 0;">
            <p><strong>👤 Customer:</strong> ${reservation.customer_name}</p>
            <p><strong>📧 Email:</strong> ${reservation.customer_email}</p>
            <p><strong>📱 Phone:</strong> ${reservation.customer_phone}</p>
            <p><strong>📅 Date & Time:</strong> ${formattedDate}</p>
            <p><strong>👥 Guests:</strong> ${reservation.guests}</p>
            <p><strong>📝 Special Requests:</strong> ${reservation.special_requests || 'None'}</p>
          </div>
          <p>Login to <a href="${process.env.FRONTEND_URL}/admin">admin dashboard</a> to manage this reservation.</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">Westend Lounge Admin System</p>
        </div>
      `,
    });
    console.log(`✅ Admin alert sent for reservation ${reservation.id}`);
  } catch (error) {
    console.error('❌ Admin alert failed:', error.message);
  }
};

module.exports = { 
  sendReservationConfirmation,
  sendOrderConfirmation, 
  sendOrderStatusUpdate, 
  sendAdminReservationAlert 
};