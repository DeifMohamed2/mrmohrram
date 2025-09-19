const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Create default admin user
const createAdminUser = async () => {
  // try {
  //   // Check if admin already exists
  //   const existingAdmin = await User.findOne({ role: 'admin' });
  //   if (existingAdmin) {
  //     console.log('Admin user already exists');
  //     return;
  //   }

  //   // Create admin user
  //   const adminUser = new User({
  //     name: 'Admin User',
  //     email: 'admin@mrmohrr7am.com',
  //     password: 'admin123', // Will be hashed by the model
  //     age: 30,
  //     year: 'Year 10', // Required field but not used for admin
  //     schoolName: 'System Administrator',
  //     studentPhoneNumber: '+1234567890',
  //     parentPhoneNumber: '+1234567891',
  //     curriculum: 'Cambridge',
  //     studentType: 'Center',
  //     role: 'admin',
  //     isActive: true,
  //   });

  //   await adminUser.save();
  //   console.log('Admin user created successfully');
  //   console.log('Email: admin@mrmohrr7am.com');
  //   console.log('Password: admin123');
  // } catch (error) {
  //   console.error('Error creating admin user:', error);
  // }
};

module.exports = { createAdminUser };
