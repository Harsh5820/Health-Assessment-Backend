const User = require('../models/User');
const HealthReport = require('../models/HealthReport');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// @desc    Upload Excel/CSV and populate DB
// @route   POST /api/admin/upload
// @access  Private/Admin
exports.uploadData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    
    // Attempt to find the specific sheets by name, fallback to first/second sheet if names differ slightly
    const clientsSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('client')) || workbook.SheetNames[0];
    const reportsSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('report')) || workbook.SheetNames[1];

    if (!clientsSheetName || !reportsSheetName) {
      return res.status(400).json({ success: false, message: 'Excel file must contain both clients and health reports sheets.' });
    }

    const clientsData = xlsx.utils.sheet_to_json(workbook.Sheets[clientsSheetName]);
    const reportsData = xlsx.utils.sheet_to_json(workbook.Sheets[reportsSheetName]);

    if (clientsData.length === 0) {
      return res.status(400).json({ success: false, message: 'Clients sheet is empty' });
    }

    // Step 1: Process Clients Data (Create Users)
    const uniqueUsersMap = new Map();
    clientsData.forEach(row => {
      if (row.email && !uniqueUsersMap.has(row.email)) {
        uniqueUsersMap.set(row.email, {
          client_id: row.client_id,
          name: row.full_name || 'Unknown User',
          email: row.email,
          password: require('bcryptjs').hashSync('password123', 10),
          role: 'user',
          mobile: String(row.mobile || ''),
          city: row.city,
          state: row.state,
          age: row.age,
          gender: row.gender,
          occupation: row.occupation,
          health_condition: row.health_condition,
          beauty_goal: row.beauty_goal,
          client_created_at: row.created_at ? new Date(row.created_at) : new Date()
        });
      }
    });

    const uniqueEmails = Array.from(uniqueUsersMap.keys());
    const existingUsers = await User.find({ email: { $in: uniqueEmails } });
    const existingEmails = new Set(existingUsers.map(u => u.email));

    // Insert only new users
    const newUsersToInsert = Array.from(uniqueUsersMap.values()).filter(u => !existingEmails.has(u.email));
    let insertedUsers = [];
    if (newUsersToInsert.length > 0) {
      insertedUsers = await User.insertMany(newUsersToInsert);
    }

    // Map Client ID -> User MongoDB ObjectId
    const allRelevantUsers = [...existingUsers, ...insertedUsers];
    const clientIdToUserId = new Map();
    allRelevantUsers.forEach(u => {
      if (u.client_id) {
        clientIdToUserId.set(u.client_id, u._id);
      }
    });

    // Step 2: Process Health Reports Data
    let healthReportsInserted = 0;
    if (reportsData && reportsData.length > 0) {
      const healthReportsToInsert = reportsData
        .filter(row => row.client_id && clientIdToUserId.has(row.client_id))
        .map(row => ({
          user: clientIdToUserId.get(row.client_id),
          client_id: row.client_id,
          report_id: String(row.report_id || ''),
          report_date: row.report_date ? new Date(row.report_date) : new Date(),
          hemoglobin: row.hemoglobin,
          vitamin_d: row.vitamin_d,
          cholesterol: row.cholesterol,
          blood_sugar_fasting: row.blood_sugar_fasting, // Use correct column name from image
          creatinine: row.creatinine,
          urine_protein: row.urine_protein,
          bmi: row.bmi,
          doctor_notes: row.doctor_notes
        }));

      if (healthReportsToInsert.length > 0) {
        await HealthReport.insertMany(healthReportsToInsert);
        healthReportsInserted = healthReportsToInsert.length;
      }
    }

    res.status(200).json({
      success: true,
      message: `Data uploaded successfully. Created ${newUsersToInsert.length} new patients and ${healthReportsInserted} medical reports.`
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Server Error processing file', error: error.message });
  }
};

// @desc    Get all users with pagination and search
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = { role: 'user' };
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip(startIndex)
      .limit(limit)
      .select('-password');

    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };

    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      data: users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single user with their reports
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const reports = await HealthReport.find({ user: req.params.id }).sort('-report_date');

    res.status(200).json({
      success: true,
      data: {
        user,
        reports
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Upload Detailed Medical Test Results
// @route   POST /api/admin/upload-test-results
// @access  Private/Admin
exports.uploadTestResults = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: 'File is empty' });
    }

    // Extract unique client IDs
    const clientIds = [...new Set(data.filter(row => row.client_id).map(row => row.client_id))];

    // Find the user ObjectIds associated with these client_ids
    const existingUsers = await User.find({ client_id: { $in: clientIds } }).select('client_id _id').lean();
    
    const clientIdToUserId = new Map();
    existingUsers.forEach(u => {
      clientIdToUserId.set(u.client_id, u._id);
    });

    // Map the dataset to detailed HealthReport documents
    const healthReportsToInsert = data
      .filter(row => row.client_id && clientIdToUserId.has(row.client_id))
      .map(row => ({
        user: clientIdToUserId.get(row.client_id),
        client_id: row.client_id,
        report_id: String(row.report_id || ''),
        report_date: row.report_date ? new Date(row.report_date) : new Date(),
        hemoglobin: row.hemoglobin,
        vitamin_d: row.vitamin_d,
        cholesterol: row.cholesterol,
        blood_sugar_fasting: row.blood_sugar_fasting, // Use correct column name
        creatinine: row.creatinine,
        urine_protein: row.urine_protein,
        bmi: row.bmi,
        doctor_notes: row.doctor_notes
      }));

    if (healthReportsToInsert.length > 0) {
      await HealthReport.insertMany(healthReportsToInsert);
    }

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${healthReportsToInsert.length} new medical reports.`
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Server Error processing file', error: error.message });
  }
};

// @desc    Download the Excel template for uploading data
// @route   GET /api/admin/template
// @access  Private/Admin
exports.downloadTemplate = (req, res) => {
  const filePath = path.join(__dirname, '../Report Upload Template.xlsx');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'Report_Upload_Template.xlsx');
  } else {
    res.status(404).json({ success: false, message: 'Template file not found on server.' });
  }
};
