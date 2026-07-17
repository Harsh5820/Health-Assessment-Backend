const express = require('express');
const { generateInsights } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Route to generate AI insights based on a user profile and report
// We protect this route so only authenticated users (or admins) can generate insights.
router.post('/generate', protect, generateInsights);

module.exports = router;
