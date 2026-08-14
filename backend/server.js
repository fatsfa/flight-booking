const express=require('express')
const cors=require('cors')
const dotenv=require('dotenv')
dotenv.config()
const app=express()
const paymentRoutes = require('./routes/paymentRoutes');
app.use(cors()) 
app.use('/api/payments/webhook', express.raw({ type: 'application/json' })); // must come before express.json()
app.use(express.json())
app.use('/api/payments', paymentRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Flight Booking API is running');
});

const PORT=process.env.PORT||5000;
app.listen(PORT,()=>{
  console.log(`Server running on port ${PORT}`);
})
const authRoutes=require('./routes/authRoutes')
app.use('/api/auth',authRoutes)
const flightRoutes=require('./routes/flightRoutes')
app.use('/api/flights',flightRoutes)
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes)

const pool = require('./config/db');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});