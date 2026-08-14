const pool=require('../config/db');

const getStats=async (req, res) => {
  try {
    const totalBookings = await pool.query('SELECT COUNT(*) FROM bookings');
    const confirmedBookings = await pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'");
    const totalRevenue = await pool.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'succeeded'");
    const totalFlights = await pool.query('SELECT COUNT(*) FROM flights');
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');

    res.json({
      totalBookings: parseInt(totalBookings.rows[0].count),
      confirmedBookings: parseInt(confirmedBookings.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      totalFlights: parseInt(totalFlights.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { getStats };