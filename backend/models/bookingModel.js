const pool = require('../config/db');

const createBooking = async (userId, flightId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 

    const flightResult = await client.query(
      'SELECT * FROM flights WHERE id = $1 FOR UPDATE',
      [flightId]
    )
    const flight = flightResult.rows[0]

    if(!flight){
      throw{status:404,message:'Flight not found'}
    }
    if (flight.seats_available<1){
      throw{status:400,message:'No seats available' };
    }

    await client.query(
      'UPDATE flights SET seats_available=seats_available-1 WHERE id=$1',
      [flightId]
    )

    const bookingResult = await client.query(
      'INSERT INTO bookings (user_id, flight_id, status) VALUES ($1, $2, $3) RETURNING *',
      [userId, flightId, 'pending']
    )

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
     JOIN flights ON bookings.flight_id=flights.id
     WHERE bookings.user_id=$1
     ORDER BY bookings.created_at DESC`,
    [userId]
  )
  return result.rows;
}

const getAllBookings = async () => {
  const result = await pool.query(
    `SELECT bookings.*, users.name AS user_name, users.email,
            flights.origin, flights.destination, flights.departure_time
     FROM bookings
     JOIN users ON bookings.user_id = users.id
     JOIN flights ON bookings.flight_id = flights.id
     ORDER BY bookings.created_at DESC`
  )
  return result.rows
}

module.exports = { createBooking, getUserBookings, getAllBookings }