const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');
const { getBookingById, releaseBookingSeats } = require('../models/bookingModel');

const cancelBookingForUser = async ({ bookingId, userId, isAdmin }) => {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw { status: 404, message: 'Booking not found' };
  }

  if (booking.user_id !== Number(userId) && !isAdmin) {
    throw { status: 403, message: 'You can only cancel your own booking' };
  }

  if (booking.status === 'cancelled') {
    throw { status: 400, message: 'Booking is already cancelled' };
  }

  const flightDate = new Date(booking.departure_time);
  const now = new Date();
  const cutoffMinutes = 24 * 60;
  const cutoff = new Date(flightDate.getTime() - cutoffMinutes * 60 * 1000);

  if (booking.status === 'confirmed' && !isAdmin && now > cutoff) {
    throw { status: 400, message: 'Cancellation is outside the allowed policy window' };
  }

  if (booking.status === 'confirmed' && booking.stripe_payment_intent) {
    try {
      await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent });
      await pool.query(
        `INSERT INTO payments (booking_id, stripe_payment_id, amount, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [booking.id, booking.stripe_payment_intent, booking.total_price, 'refunded']
      );
    } catch (err) {
      console.error('Refund failed:', err.message);
      throw { status: 400, message: 'Refund could not be processed for this booking' };
    }
  }

  await releaseBookingSeats(booking.id);
  return { message: 'Booking cancelled successfully' };
};

module.exports = { cancelBookingForUser };
