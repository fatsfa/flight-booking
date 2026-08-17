// models/flightModel.js
const pool = require('../config/db');

const getAllFlights = async ({ page = 1, limit = 20 } = {}) => {
  const offset = (Number(page) - 1) * Number(limit);
  const result = await pool.query(
    `SELECT * FROM flights
     ORDER BY departure_time ASC
     LIMIT $1 OFFSET $2`,
    [Number(limit), offset]
  );
  return result.rows;
};

const searchFlights = async ({ origin, destination, date, passengerCount = 1, page = 1, limit = 20 } = {}) => {
  let query = `
    SELECT f.*
    FROM flights f
    WHERE 1 = 1
  `;
  const params = [];

  if (origin) {
    params.push(`%${origin}%`);
    query += ` AND f.origin ILIKE $${params.length}`;
  }

  if (destination) {
    params.push(`%${destination}%`);
    query += ` AND f.destination ILIKE $${params.length}`;
  }

  if (date) {
    params.push(date);
    query += ` AND DATE(f.departure_time) = $${params.length}`;
  }

  if (Number(passengerCount) > 0) {
    params.push(Number(passengerCount));
    query += ` AND f.seats_available >= $${params.length}`;
  }

  query += ' ORDER BY f.departure_time ASC';

  const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS filtered`;
  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0].total);

  const offset = (Number(page) - 1) * Number(limit);
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Number(limit), offset);

  const result = await pool.query(query, params);
  return { flights: result.rows, total, page: Number(page), limit: Number(limit) };
};

const createFlight = async (origin, destination, departure_time, price, seats_available, airline = 'SkyJet') => {
  const result = await pool.query(
    'INSERT INTO flights (origin, destination, departure_time, price, seats_available, airline) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [origin, destination, departure_time, price, seats_available, airline]
  );
  return result.rows[0];
};

const updateFlight = async (id, updates) => {
  const { origin, destination, departure_time, price, seats_available, airline } = updates;
  const result = await pool.query(
    `UPDATE flights SET origin=$1, destination=$2, departure_time=$3, price=$4, seats_available=$5, airline=$6
     WHERE id=$7 RETURNING *`,
    [origin, destination, departure_time, price, seats_available, airline || 'SkyJet', id]
  );
  return result.rows[0];
};

const deleteFlight = async (id) => {
  await pool.query('DELETE FROM flights WHERE id = $1', [id]);
};

module.exports = { getAllFlights, searchFlights, createFlight, updateFlight, deleteFlight };