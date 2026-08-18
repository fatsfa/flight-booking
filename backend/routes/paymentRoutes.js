const express = require('express');
const router = express.Router();
const { createCheckoutSession, handleWebhook, confirmBookingPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/checkout', protect, createCheckoutSession);
router.post('/confirm', protect, confirmBookingPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;