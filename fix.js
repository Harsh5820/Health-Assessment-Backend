const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const fixPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find all users WITH password field
    const users = await User.find({ role: 'user' }).select('+password');
    let count = 0;
    
    for (const user of users) {
      if (user.password === 'password123') { 
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);
        await User.updateOne({ _id: user._id }, { $set: { password: hash } });
        count++;
      }
    }
    
    console.log('Fixed passwords for ' + count + ' users!');
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};

fixPasswords();
