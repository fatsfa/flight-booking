// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/stats', protect, adminOnly, getStats);

module.exports = router;