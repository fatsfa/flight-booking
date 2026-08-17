// models/bookingModel.js
const pool = require('../config/db');
const { sendBookingStatusEmail } = require('../utils/emailService');

function getBaggageSurchargePercent(extraBaggageKg) {
  if (extraBaggageKg === 10) return 5;
  if (extraBaggageKg === 20) return 10;
  return 0;
}

const calculateTotalPrice = (flightPrice, passengers, extraBaggageKg) => {
  const surchargePercent = getBaggageSurchargePercent(extraBaggageKg);
  const baseTotal = flightPrice * passengers;
  return (baseTotal * (1 + surchargePercent / 100)).toFixed(2);
};

const createBooking = async (userId, flightId, passengers, extraBaggageKg, passengerDetails = []) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const flightResult = await client.query(
      'SELECT * FROM flights WHERE id = $1 FOR UPDATE',
      [flightId]
    );
    const flight = flightResult.rows[0];

    if (!flight) {
      throw { status: 404, message: 'Flight not found' };
    }

    if (flight.seats_available < passengers) {
      throw {
        status: 400,
        message: `Only ${flight.seats_available} seat(s) left, but ${passengers} requested`,
      };
    }

    const totalPrice = calculateTotalPrice(Number(flight.price), Number(passengers), Number(extraBaggageKg));

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, flight_id, status, passengers, passenger_details, extra_baggage_kg, total_price, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, flightId, 'pending', passengers, JSON.stringify(passengerDetails), extraBaggageKg, totalPrice, 'pending']
    );

    await client.query('COMMIT');
    return bookingResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getBookingById = async (id) => {
  const result = await pool.query(
    `SELECT bookings.*, flights.origin, flights.destination, flights.departure_time, flights.price
     FROM bookings
     JOIN flights ON bookings.flight_id = flights.id
     WHERE bookings.id = $1`,
    [id]
  );

  return result.rows[0];
};

const deleteExpiredBookings = async () => {
  const result = await pool.query(
    `DELETE FROM bookings
     WHERE status IN ('pending', 'cancelled')
       AND created_at < NOW() - INTERVAL '5 minutes'
     RETURNING id` 
  );

  return result.rows;
};

const getUserBookings = async (userId) => {
  const result = await pool.query(
    `SELECT bookings.*, flights.origin, flights.destination, flights.departure_time, flights.price
     FROM bookings
     JOIN flights ON bookings.flight_id = flights.id
     WHERE bookings.user_id = $1
       AND NOT (
         bookings.status IN ('pending', 'cancelled')
         AND bookings.created_at < NOW() - INTERVAL '5 minutes'
       )
     ORDER BY bookings.created_at DESC`,
    [userId]
  );
  return result.rows;
};

const getAllBookings = async (filters = {}) => {
  const { status, fromDate, toDate, route } = filters;
  const clauses = [];
  const params = [];

  if (status) {
    params.push(status);
    clauses.push(`bookings.status = $${params.length}`);
  }

  if (fromDate) {
    params.push(fromDate);
    clauses.push(`DATE(flights.departure_time) >= $${params.length}`);
  }

  if (toDate) {
    params.push(toDate);
    clauses.push(`DATE(flights.departure_time) <= $${params.length}`);
  }

  if (route) {
    params.push(`%${route}%`);
    clauses.push(`(flights.origin ILIKE $${params.length} OR flights.destination ILIKE $${params.length})`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT bookings.*, users.name AS user_name, users.email,
            flights.origin, flights.destination, flights.departure_time
     FROM bookings
     JOIN users ON bookings.user_id = users.id
     JOIN flights ON bookings.flight_id = flights.id
     ${whereClause}
     ORDER BY bookings.created_at DESC`,
    params
  );

  return result.rows;
};

const updateBookingStatus = async (bookingId, status, extra = {}) => {
  const fields = ['status = $1'];
  const params = [status, bookingId];

  if (extra.paymentStatus) {
    fields.push('payment_status = $' + (params.length - 1));
    params.splice(1, 0, extra.paymentStatus);
  }

  if (extra.stripePaymentIntent) {
    fields.push('stripe_payment_intent = $' + (params.length - 1));
    params.splice(1, 0, extra.stripePaymentIntent);
  }

  if (extra.cancelledAt) {
    fields.push('cancelled_at = $' + (params.length - 1));
    params.splice(1, 0, extra.cancelledAt);
  }

  if (extra.cancellationCutoff) {
    fields.push('cancellation_cutoff = $' + (params.length - 1));
    params.splice(1, 0, extra.cancellationCutoff);
  }

  const query = `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`;
  const result = await pool.query(query, params);
  return result.rows[0];
};

const releaseBookingSeats = async (bookingId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    const booking = bookingResult.rows[0];

    if (!booking) {
      throw { status: 404, message: 'Booking not found' };
    }

    if (booking.status === 'pending' || booking.status === 'confirmed') {
      await client.query(
        'UPDATE flights SET seats_available = seats_available + $1 WHERE id = $2',
        [booking.passengers, booking.flight_id]
      );
    }

    await client.query(
      `UPDATE bookings
       SET status = 'cancelled', payment_status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1`,
      [bookingId]
    );

    try {
      await sendBookingStatusEmail(bookingId, 'cancelled');
    } catch (emailErr) {
      console.error('Cancellation email failed:', emailErr.message);
    }

    await client.query('COMMIT');
    return booking;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const confirmBookingSeats = async (bookingId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    const booking = bookingResult.rows[0];

    if (!booking) {
      throw { status: 404, message: 'Booking not found' };
    }

    if (booking.status === 'confirmed') {
      await client.query('COMMIT');
      return booking;
    }

    const flightResult = await client.query(
      'SELECT * FROM flights WHERE id = $1 FOR UPDATE',
      [booking.flight_id]
    );
    const flight = flightResult.rows[0];

    if (!flight) {
      throw { status: 404, message: 'Flight not found' };
    }

    if (flight.seats_available < booking.passengers) {
      throw { status: 400, message: 'Insufficient seats remaining to confirm this booking' };
    }

    await client.query(
      'UPDATE flights SET seats_available = seats_available - $1 WHERE id = $2',
      [booking.passengers, booking.flight_id]
    );

    await client.query(
      `UPDATE bookings
       SET status = 'confirmed', payment_status = 'paid', cancelled_at = NULL
       WHERE id = $1`,
      [bookingId]
    );

    try {
      await sendBookingStatusEmail(bookingId, 'confirmed');
    } catch (emailErr) {
      console.error('Confirmation email failed:', emailErr.message);
    }

    await client.query('COMMIT');
    return booking;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createBooking,
  getBookingById,
  getUserBookings,
  getAllBookings,
  updateBookingStatus,
  releaseBookingSeats,
  confirmBookingSeats,
  calculateTotalPrice,
  deleteExpiredBookings,
};