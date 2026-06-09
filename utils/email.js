// server/utils/email.js
const nodemailer = require('nodemailer');

// Create transporter for Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Send reservation confirmation to CUSTOMER
const sendReservationConfirmation = async (reservation) => {
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

  console.log('📧 Sending reservation confirmation to:', reservation.customer_email);

  try {
    const info = await transporter.sendMail({
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
          
          <p>To cancel or modify, please contact us at +234 803 722 7263.</p>
          <br/>
          <p>We look forward to serving you!</p>
          <p><strong>Westend Lounge Team</strong> ❤️</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">139 Akowonjo Road, Alimosho, Lagos | +234 803 722 7263</p>
        </div>
      `,
    });

    console.log(`✅ Reservation confirmation sent to ${reservation.customer_email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Failed to send reservation email:', error.message);
  }
};

// Send order confirmation to CUSTOMER
const sendOrderConfirmation = async (order) => {
  console.log('📧 Sending order confirmation to:', order.customer_email);

  try {
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
          <p>Track your order: <a href="${process.env.FRONTEND_URL}/track-order/${order.order_id}">Click here</a></p>
          <br/>
          <p>Westend Lounge – 139 Akowonjo Road, Lagos</p>
        </div>
      `,
    });

    console.log(`✅ Order confirmation sent to ${order.customer_email}`);
  } catch (error) {
    console.error('❌ Failed to send order email:', error.message);
  }
};

// Send order status update to CUSTOMER
const sendOrderStatusUpdate = async (order, newStatus) => {
  let statusMessage = '';
  switch(newStatus) {
    case 'preparing': statusMessage = 'Your order is being prepared by our chefs! 🔥'; break;
    case 'ready': statusMessage = 'Your order is ready for pickup! 🎉'; break;
    case 'completed': statusMessage = 'Order completed! Thank you for choosing Westend! ❤️'; break;
    case 'cancelled': statusMessage = 'Your order has been cancelled.'; break;
    default: statusMessage = `Your order status is now: ${newStatus}`;
  }

  console.log('📧 Sending status update to:', order.customer_email);

  try {
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
    console.error('❌ Failed to send status email:', error.message);
  }
};

// Send notification to ADMIN (new reservation alert)
const sendAdminReservationAlert = async (reservation) => {
  const formattedDateTime = new Date(reservation.reservation_date).toLocaleString();
  
  console.log('📧 Sending admin alert to:', process.env.ADMIN_EMAIL);
  
  if (!process.env.ADMIN_EMAIL) {
    console.log('⚠️ No ADMIN_EMAIL set, skipping admin alert');
    return;
  }
  
  try {
    await transporter.sendMail({
      from: `"Westend Lounge Admin" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '🆕 New Table Reservation Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #FFD700;">New Reservation! 🆕</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 15px 0;">
            <p><strong>👤 Customer:</strong> ${reservation.customer_name}</p>
            <p><strong>📧 Email:</strong> ${reservation.customer_email}</p>
            <p><strong>📱 Phone:</strong> ${reservation.customer_phone}</p>
            <p><strong>📅 Date & Time:</strong> ${formattedDateTime}</p>
            <p><strong>👥 Guests:</strong> ${reservation.guests}</p>
            <p><strong>📝 Special Requests:</strong> ${reservation.special_requests || 'None'}</p>
          </div>
          <p>Login to <a href="${process.env.FRONTEND_URL}/admin">admin dashboard</a> to manage.</p>
        </div>
      `,
    });

    console.log(`✅ Admin alert sent for reservation ${reservation.id}`);
  } catch (error) {
    console.log('⚠️ Admin email failed:', error.message);
  }
};

module.exports = { 
  sendReservationConfirmation,
  sendOrderConfirmation, 
  sendOrderStatusUpdate, 
  sendAdminReservationAlert
};