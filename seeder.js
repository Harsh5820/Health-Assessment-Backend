const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const importData = async () => {
  try {
    // Clear existing admin user
    await User.deleteMany({ email: 'admin@healthcare.com' });

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@healthcare.com',
      password: 'password123',
      role: 'admin'
    });

    console.log('Admin user seeded:', adminUser.email);
    process.exit();
  } catch (error) {
    console.error(`Error with data import: ${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await User.deleteMany();
    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error with data destruction: ${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
