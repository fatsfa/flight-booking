const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const pool = require('./config/db');
const { deleteExpiredBookings } = require('./models/bookingModel');

dotenv.config();

const app = express();
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const flightRoutes = require('./routes/flightRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const initializeDatabase = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS flights (
      id SERIAL PRIMARY KEY,
      airline VARCHAR(100) NOT NULL DEFAULT 'SkyJet',
      origin VARCHAR(100) NOT NULL,
      destination VARCHAR(100) NOT NULL,
      departure_time TIMESTAMPTZ NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      seats_available INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      flight_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      passengers INTEGER NOT NULL DEFAULT 1,
      passenger_details JSONB NOT NULL DEFAULT '[]'::jsonb,
      extra_baggage_kg INTEGER NOT NULL DEFAULT 0,
      total_price NUMERIC(10,2) NOT NULL,
      stripe_payment_intent VARCHAR(255),
      payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
      cancellation_cutoff TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      stripe_payment_id VARCHAR(255),
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS payment_events (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(255) UNIQUE NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passengers INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_details JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_baggage_kg INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255)`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid'`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_cutoff TIMESTAMPTZ`,
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
    `ALTER TABLE flights ADD COLUMN IF NOT EXISTS airline VARCHAR(100) NOT NULL DEFAULT 'SkyJet'`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255)`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending'`,
    `CREATE INDEX IF NOT EXISTS idx_flights_origin_destination_date ON flights (origin, destination, departure_time)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings (user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings (flight_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash)`
  ];

  for (const query of queries) {
    await pool.query(query);
  }

  const adminUser = await pool.query("SELECT id FROM users WHERE email = 'admin@flightbooking.local' LIMIT 1");
  if (adminUser.rows.length === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
      ['Admin', 'admin@flightbooking.local', adminHash, 'admin']
    );
  }

  const flightCount = await pool.query('SELECT COUNT(*) FROM flights');
  if (parseInt(flightCount.rows[0].count, 10) === 0) {
    const baseDate = new Date();
    const flights = [
      ['New York', 'Chicago', new Date(baseDate.getTime() + 86400000 * 2).toISOString(), 220.0, 12, 'SkyJet'],
      ['New York', 'Los Angeles', new Date(baseDate.getTime() + 86400000 * 4).toISOString(), 340.0, 8, 'AirLuna'],
      ['Chicago', 'Miami', new Date(baseDate.getTime() + 86400000 * 3).toISOString(), 280.0, 10, 'BlueWing'],
      ['San Francisco', 'Seattle', new Date(baseDate.getTime() + 86400000 * 5).toISOString(), 180.0, 15, 'SkyJet'],
      ['Boston', 'Dallas', new Date(baseDate.getTime() + 86400000 * 6).toISOString(), 260.0, 9, 'CloudAir'],
      ['Seattle', 'Denver', new Date(baseDate.getTime() + 86400000 * 8).toISOString(), 210.0, 11, 'AeroNest']
    ];

    for (const [origin, destination, departureTime, price, seatsAvailable, airline] of flights) {
      await pool.query(
        'INSERT INTO flights (origin, destination, departure_time, price, seats_available, airline) VALUES ($1, $2, $3, $4, $5, $6)',
        [origin, destination, departureTime, price, seatsAvailable, airline]
      );
    }
  }
};

app.use(cors());
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.send('Flight Booking API is running');
});

const cleanupExpiredBookings = async () => {
  try {
    const deleted = await deleteExpiredBookings();
    if (deleted.length > 0) {
      console.log(`Auto-pruned ${deleted.length} stale pending/cancelled booking(s)`);
    }
  } catch (err) {
    console.error('Booking cleanup failed:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await initializeDatabase();
    await cleanupExpiredBookings();
    console.log('Database connected and initialized');
    setInterval(cleanupExpiredBookings, 5 * 60 * 1000);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
})();