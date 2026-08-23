const express = require('express');
const router = express.Router();
const { submitContact, submitBooking } = require('../controllers/contactController');

router.post('/', submitContact);
router.post('/booking', submitBooking);

module.exports = router;
