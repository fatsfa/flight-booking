const express = require('express')
const router = express.Router()
const { listFlights, addFlight, editFlight, removeFlight } = require('../controllers/flightController')
const { protect, adminOnly } = require('../middleware/authMiddleware')

router.get('/', listFlights);                
router.post('/', protect, adminOnly, addFlight);        
router.put('/:id', protect, adminOnly, editFlight);     
router.delete('/:id', protect, adminOnly, removeFlight); 
module.exports = router;