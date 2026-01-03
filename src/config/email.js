const nodemailer = require('nodemailer');
const config = require('./config');

/**
 * Email transporter configuration
 * For production, use SendGrid/AWS SES
 */
const createTransporter = () => {
  // Gmail configuration (for development)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });
};

/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async (user, reservation, table) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Luxury Dining" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '✅ Booking Confirmation - Luxury Dining',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #D4AF37 0%, #B8960F 100%); color: #0A1128; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 32px; letter-spacing: 2px; }
            .content { padding: 40px 30px; }
            .booking-details { background: #f8f9fa; border-left: 5px solid #D4AF37; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .booking-details h2 { color: #0A1128; margin-top: 0; }
            .detail-row { margin: 15px 0; font-size: 16px; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #0A1128; }
            .qr-code { text-align: center; margin: 30px 0; }
            .footer { background: #0A1128; color: #D4AF37; text-align: center; padding: 20px; font-size: 14px; }
            .btn { display: inline-block; background: #D4AF37; color: #0A1128; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>◆ LUXURY DINING ◆</h1>
              <p style="margin: 10px 0 0; font-size: 18px;">Booking Confirmed!</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #333;">Dear <strong>${user.name}</strong>,</p>
              <p style="font-size: 16px; color: #555; line-height: 1.6;">
                Thank you for choosing Luxury Dining. Your table reservation has been confirmed.
              </p>
              
              <div class="booking-details">
                <h2>Reservation Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Booking ID:</span>
                  <span class="detail-value">#${reservation._id.toString().substring(0, 8).toUpperCase()}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Table Number:</span>
                  <span class="detail-value">${table.tableNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date(reservation.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${reservation.startTime} - ${reservation.endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Guests:</span>
                  <span class="detail-value">${reservation.guestCount} ${reservation.guestCount === 1 ? 'Person' : 'People'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Table Capacity:</span>
                  <span class="detail-value">${table.capacity} People</span>
                </div>
              </div>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 30px;">
                We look forward to serving you. Please arrive 10 minutes before your reservation time.
              </p>

              <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <strong>Cancellation Policy:</strong> You can cancel your reservation up to 2 hours before the booking time.
              </div>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/my-reservations" class="btn">View My Reservations</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;">◆ LUXURY DINING ◆</p>
              <p style="margin: 5px 0; color: #D4AF37;">Experience Fine Dining Excellence</p>
              <p style="margin: 15px 0 5px; font-size: 12px; color: #999;">
                Need help? Contact us at support@luxurydining.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation email sent to:', user.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send cancellation email
 */
const sendCancellationEmail = async (user, reservation, table) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Luxury Dining" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🚫 Reservation Cancelled - Luxury Dining',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6B0F1A 0%, #8B1538 100%); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 32px; letter-spacing: 2px; }
            .content { padding: 40px 30px; }
            .cancellation-box { background: #ffe5e5; border-left: 5px solid #c41e3a; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .footer { background: #0A1128; color: #D4AF37; text-align: center; padding: 20px; font-size: 14px; }
            .btn { display: inline-block; background: #D4AF37; color: #0A1128; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>◆ LUXURY DINING ◆</h1>
              <p style="margin: 10px 0 0; font-size: 18px;">Reservation Cancelled</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #333;">Dear <strong>${user.name}</strong>,</p>
              
              <div class="cancellation-box">
                <h2 style="margin-top: 0; color: #c41e3a;">Cancellation Confirmed</h2>
                <p style="color: #555;">Your reservation has been successfully cancelled.</p>
                <p style="margin: 10px 0;"><strong>Booking ID:</strong> #${reservation._id.toString().substring(0, 8).toUpperCase()}</p>
                <p style="margin: 10px 0;"><strong>Table:</strong> ${table.tableNumber}</p>
                <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date(reservation.date).toLocaleDateString()}</p>
                <p style="margin: 10px 0;"><strong>Time:</strong> ${reservation.startTime} - ${reservation.endTime}</p>
              </div>

              <p style="font-size: 16px; color: #555; line-height: 1.6;">
                We're sorry to see you cancel. We hope to serve you in the future.
              </p>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/book-table" class="btn">Book Again</a>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;">◆ LUXURY DINING ◆</p>
              <p style="margin: 5px 0; color: #D4AF37;">Experience Fine Dining Excellence</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Cancellation email sent to:', user.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send reminder email (24 hours before)
 */
const sendReminderEmail = async (user, reservation, table) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Luxury Dining" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '⏰ Reminder: Your Reservation Tomorrow - Luxury Dining',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #D4AF37 0%, #B8960F 100%); color: #0A1128; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .reminder-box { background: #fff3cd; border-left: 5px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .footer { background: #0A1128; color: #D4AF37; text-align: center; padding: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>◆ LUXURY DINING ◆</h1>
              <p style="margin: 10px 0 0; font-size: 18px;">Reservation Reminder</p>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #333;">Dear <strong>${user.name}</strong>,</p>
              
              <div class="reminder-box">
                <h2 style="margin-top: 0; color: #856404;">⏰ Your Reservation is Tomorrow!</h2>
                <p><strong>Table:</strong> ${table.tableNumber}</p>
                <p><strong>Date:</strong> ${new Date(reservation.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${reservation.startTime}</p>
                <p><strong>Guests:</strong> ${reservation.guestCount}</p>
              </div>

              <p style="font-size: 16px; color: #555; line-height: 1.6;">
                We're excited to welcome you tomorrow! Please arrive 10 minutes early.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;">◆ LUXURY DINING ◆</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Reminder email sent to:', user.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send admin notification
 */
const sendAdminNotification = async (reservation, user, table) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Luxury Dining System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: '🔔 New Reservation - Admin Notification',
      html: `
        <h2>New Reservation Received</h2>
        <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
        <p><strong>Table:</strong> ${table.tableNumber}</p>
        <p><strong>Date:</strong> ${new Date(reservation.date).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${reservation.startTime} - ${reservation.endTime}</p>
        <p><strong>Guests:</strong> ${reservation.guestCount}</p>
        <p><strong>Booking ID:</strong> #${reservation._id.toString().substring(0, 8).toUpperCase()}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification sent');
    return { success: true };
  } catch (error) {
    console.error('❌ Admin notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBookingConfirmation,
  sendCancellationEmail,
  sendReminderEmail,
  sendAdminNotification
};
