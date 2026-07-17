const HealthReport = require('../models/HealthReport');

// @desc    Get logged in user's latest report and history
// @route   GET /api/user/reports
// @access  Private/User
exports.getMyReports = async (req, res) => {
  try {
    const reports = await HealthReport.find({ user: req.user.id }).sort('-report_date');

    res.status(200).json({
      success: true,
      data: {
        latestReport: reports.length > 0 ? reports[0] : null,
        history: reports
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
