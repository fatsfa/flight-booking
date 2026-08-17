const nodemailer = require('nodemailer');
const pool = require('../config/db');

const getTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: { user, pass },
  });
};

const sendBookingEmail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();

  if (!transporter || !to) {
    console.log(`[Email skipped] ${subject} -> ${to || 'no recipient'}`);
    return { ok: false, skipped: true };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Aurelia Air <no-reply@aureliaair.com>',
      to,
      subject,
      text,
      html,
    });

    return { ok: true, skipped: false };
  } catch (error) {
    console.error('Failed to send email:', error.message);
    return { ok: false, skipped: false, error: error.message };
  }
};

const getBookingUserForEmail = async (bookingId) => {
  const result = await pool.query(
    `SELECT users.email AS user_email, flights.origin, flights.destination, bookings.status, bookings.total_price
     FROM bookings
     JOIN users ON users.id = bookings.user_id
     JOIN flights ON flights.id = bookings.flight_id
     WHERE bookings.id = $1`,
    [bookingId]
  );

  return result.rows[0];
};

const sendBookingStatusEmail = async (bookingId, status) => {
  const booking = await getBookingUserForEmail(bookingId);

  if (!booking || !booking.user_email) {
    return { ok: false, skipped: true };
  }

  const isConfirmed = status === 'confirmed';
  const subject = isConfirmed
    ? 'Your Aurelia Air booking is confirmed'
    : 'Your Aurelia Air booking has been cancelled';

  const text = isConfirmed
    ? `Your flight from ${booking.origin} to ${booking.destination} has been confirmed. Total paid: $${Number(booking.total_price).toFixed(2)}.`
    : `Your booking from ${booking.origin} to ${booking.destination} has been cancelled. The value may be refunded according to policy.`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin-bottom: 12px; color: #111827;">Aurelia Air</h2>
      <p>${isConfirmed ? 'Your flight booking is confirmed.' : 'Your booking has been cancelled.'}</p>
      <p><strong>Route:</strong> ${booking.origin} → ${booking.destination}</p>
      <p><strong>Status:</strong> ${isConfirmed ? 'Confirmed' : 'Cancelled'}</p>
      <p><strong>Total:</strong> $${Number(booking.total_price).toFixed(2)}</p>
      <p>${isConfirmed ? 'We look forward to welcoming you onboard.' : 'If a refund is applicable, it will be processed based on the booking rules.'}</p>
    </div>
  `;

  return sendBookingEmail({
    to: booking.user_email,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendBookingEmail,
  sendBookingStatusEmail,
};
