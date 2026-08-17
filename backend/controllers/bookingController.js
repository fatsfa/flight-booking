// controllers/bookingController.js
const { createBooking, getUserBookings, getAllBookings, getBookingById } = require('../models/bookingModel');
const { cancelBookingForUser } = require('../services/bookingService');

const bookFlight = async (req, res) => {
  try {
    const { flightId, passengers, extraBaggageKg, passengerDetails } = req.body;

    if (!flightId) {
      return res.status(400).json({ error: 'flightId is required' });
    }

    const passengerCount = passengers ? Number(passengers) : 1;
    const baggageKg = extraBaggageKg ? Number(extraBaggageKg) : 0;

    if (![0, 10, 20].includes(baggageKg)) {
      return res.status(400).json({ error: 'extraBaggageKg must be 0, 10, or 20' });
    }

    if (passengerCount < 1) {
      return res.status(400).json({ error: 'passengers must be at least 1' });
    }

    if (!Array.isArray(passengerDetails) || passengerDetails.length !== passengerCount) {
      return res.status(400).json({ error: 'Passenger details are required for each passenger' });
    }

    for (const passenger of passengerDetails) {
      const missing = [
        'fullName',
        'dateOfBirth',
        'nationality',
        'passportNumber',
        'email',
        'contactNumber',
      ].filter((field) => !passenger[field]);

      if (missing.length) {
        return res.status(400).json({ error: `Missing passenger details: ${missing.join(', ')}` });
      }
    }

    const booking = await createBooking(req.user.id, flightId, passengerCount, baggageKg, passengerDetails);
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
    const bookings = await getAllBookings(req.query);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const getUserBookingsById = async (req, res) => {
  try {
    if (Number(req.params.userId) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own bookings' });
    }

    const bookings = await getUserBookings(req.params.userId);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const result = await cancelBookingForUser({
      bookingId: req.params.id,
      userId: req.user.id,
      isAdmin: req.user.role === 'admin',
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
  }
};

module.exports = { bookFlight, myBookings, allBookings, getUserBookingsById, cancelBooking };