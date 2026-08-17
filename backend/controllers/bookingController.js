// controllers/bookingController.js
const { createBooking, getUserBookings, getAllBookings } = require('../models/bookingModel');

const bookFlight = async (req, res) => {
  try {
    const { flightId, passengers, extraBaggageKg } = req.body;

    if (!flightId) {
      return res.status(400).json({ error: 'flightId is required' });
    }

    // default to 1 passenger and 0 extra baggage if not sent
    const passengerCount = passengers ? Number(passengers) : 1;
    const baggageKg = extraBaggageKg ? Number(extraBaggageKg) : 0;

    // only 0, 10, or 20 are valid extra baggage options
    if (![0, 10, 20].includes(baggageKg)) {
      return res.status(400).json({ error: 'extraBaggageKg must be 0, 10, or 20' });
    }

    if (passengerCount < 1) {
      return res.status(400).json({ error: 'passengers must be at least 1' });
    }

    const booking = await createBooking(req.user.id, flightId, passengerCount, baggageKg);
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Something went wrong' });
  }
};

const myBookings = async (req, res) => {
  try {
    const bookings = await getUserBookings(req.user.id);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const allBookings = async (req, res) => {
  try {
    const bookings = await getAllBookings();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const getUserBookingsById = async (req, res) => {
  try {
    const bookings = await getUserBookings(req.params.userId);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { bookFlight, myBookings, allBookings, getUserBookingsById };