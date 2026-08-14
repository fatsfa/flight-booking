const { createBooking, getUserBookings, getAllBookings } = require('../models/bookingModel');

const bookFlight=async(req, res)=>{
  try{
    const{flightId}=req.body;
    if(!flightId){
      return res.status(400).json({ error: 'flightId is required' });
    }
    const booking = await createBooking(req.user.id, flightId);
    res.status(201).json(booking);
  } catch(err){
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Something went wrong' });
  }
}

const myBookings=async(req, res)=>{
  try {
    const bookings = await getUserBookings(req.user.id);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'Something went wrong'})
  }
}

const allBookings=async(req,res)=>{
  try {
    const bookings = await getAllBookings();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}

const getUserBookingsById = async (req, res) => {
  try {
    const { getUserBookings } = require('../models/bookingModel');
    const bookings = await getUserBookings(req.params.userId);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { bookFlight, myBookings, allBookings, getUserBookingsById };
