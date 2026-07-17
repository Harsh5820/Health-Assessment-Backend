const express = require('express');
const { getMyReports } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all user routes
router.use(protect);

router.get('/reports', getMyReports);

module.exports = router;
