const express = require('express');
const multer = require('multer');
const { uploadData, getUsers, getUserDetails, uploadTestResults, downloadTemplate } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer to use memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/upload', upload.single('file'), uploadData);
router.post('/upload-test-results', upload.single('file'), uploadTestResults);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.get('/template', downloadTemplate);

module.exports = router;
