// models/bookingModel.js
const pool = require('../config/db');

// works out the surcharge percentage based on extra baggage selected
function getBaggageSurchargePercent(extraBaggageKg) {
  if (extraBaggageKg === 10) return 5;
  if (extraBaggageKg === 20) return 10;
  return 0; // no extra baggage, no surcharge
}

const createBooking = async (userId, flightId, passengers, extraBaggageKg) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // lock the flight row so no one else can book the last seats at the same instant
    const flightResult = await client.query(
      'SELECT * FROM flights WHERE id = $1 FOR UPDATE',
      [flightId]
    );
    const flight = flightResult.rows[0];

    if (!flight) {
      throw { status: 404, message: 'Flight not found' };
    }
    if (flight.seats_available < passengers) {
      throw { status: 400, message: `Only ${flight.seats_available} seat(s) left, but ${passengers} requested` };
    }

    // calculate total price
    const surchargePercent = getBaggageSurchargePercent(extraBaggageKg);
    const baseTotal = flight.price * passengers;
    const totalPrice = baseTotal * (1 + surchargePercent / 100);

    // reduce seat count by the number of passengers
    await client.query(
      'UPDATE flights SET seats_available = seats_available - $1 WHERE id = $2',
      [passengers, flightId]
    );

    // create the booking with all the new fields
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, flight_id, status, passengers, extra_baggage_kg, total_price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, flightId, 'pending', passengers, extraBaggageKg, totalPrice.toFixed(2)]
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

const getUserBookings = async (userId) => {
  const result = await pool.query(
    `SELECT bookings.*, flights.origin, flights.destination, flights.departure_time, flights.price
     FROM bookings
     JOIN flights ON bookings.flight_id = flights.id
     WHERE bookings.user_id = $1
     ORDER BY bookings.created_at DESC`,
    [userId]
  );
  return result.rows;
};

const getAllBookings = async () => {
  const result = await pool.query(
    `SELECT bookings.*, users.name AS user_name, users.email,
            flights.origin, flights.destination, flights.departure_time
     FROM bookings
     JOIN users ON bookings.user_id = users.id
     JOIN flights ON bookings.flight_id = flights.id
     ORDER BY bookings.created_at DESC`
  );
  return result.rows;
};

module.exports = { createBooking, getUserBookings, getAllBookings };