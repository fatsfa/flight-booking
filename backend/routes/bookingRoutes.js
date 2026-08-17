
const express = require('express');
const router = express.Router();
const { bookFlight, myBookings, allBookings, getUserBookingsById, cancelBooking } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, bookFlight);
router.get('/my', protect, myBookings);
router.get('/', protect, adminOnly, allBookings);
router.get('/user/:userId', protect, adminOnly, getUserBookingsById);
router.post('/:id/cancel', protect, cancelBooking);

module.exports = router;