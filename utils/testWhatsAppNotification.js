/**
 * Test script for WhatsApp notifications
 * 
 * This script tests the WhatsApp notification functionality by:
 * 1. Sending a test message directly using wasender
 * 2. Testing homework submission notification
 * 3. Testing due date reminder notification
 * 
 * Usage:
 * node testWhatsAppNotification.js [phoneNumber] [submissionId]
 * 
 * Example:
 * node testWhatsAppNotification.js 201234567890 60f1a2b3c4d5e6f7g8h9i0j1
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const wasender = require('./wasender');
const notificationService = require('./notificationService');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const WeekContent = require('../models/WeekContent');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Get command line arguments
const args = process.argv.slice(2);
const phoneNumber = args[0] || '01156012078'; // Default test number
const submissionId = args[1]; // Optional submission ID

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mr-moharr7am')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Test direct message sending
 */
async function testDirectMessage() {
  console.log(`\n=== Testing direct message to ${phoneNumber} ===`);
  
  try {
    const message = `This is a test message from Mr. Moharr7am system. Time: ${new Date().toLocaleString()}`;
    
    console.log(`Sending message: "${message}"`);
    
    const result = await wasender.sendTextMessage(
      process.env.WHATSAPP_SESSION_API_KEY || '970|tIUXqi21K6wHI47T72xHkz55M9x7hhnpP7RY6GjZ672e1aac',
      phoneNumber,
      message
    );
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Direct message test PASSED');
    } else {
      console.log('❌ Direct message test FAILED');
    }
    
    return result.success;
  } catch (error) {
    console.error('Error in direct message test:', error);
    console.log('❌ Direct message test FAILED with exception');
    return false;
  }
}

/**
 * Test homework submission notification
 */
async function testHomeworkSubmissionNotification() {
  console.log('\n=== Testing homework submission notification ===');
  
  try {
    if (!submissionId) {
      console.log('No submission ID provided, finding a recent submission...');
      
      // Find a recent submission
      const submission = await HomeworkSubmission.findOne({})
        .sort({ submissionDate: -1 })
        .populate('student', 'name parentPhoneNumber');
      
      if (!submission) {
        console.log('❌ No homework submissions found in database');
        return false;
      }
      
      console.log(`Found submission: ${submission._id} by ${submission.student ? submission.student.name : 'Unknown'}`);
      
      // Override parent phone number for testing if needed
      if (submission.student && phoneNumber) {
        console.log(`Temporarily updating parent phone number to ${phoneNumber} for testing`);
        const originalPhone = submission.student.parentPhoneNumber;
        submission.student.parentPhoneNumber = phoneNumber;
        await submission.student.save();
        
        // Reset after test
        setTimeout(async () => {
          submission.student.parentPhoneNumber = originalPhone;
          await submission.student.save();
          console.log('Reset parent phone number to original value');
        }, 5000);
      }
      
      const result = await notificationService.sendHomeworkSubmissionNotification(submission._id);
      
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Homework submission notification test PASSED');
      } else {
        console.log('❌ Homework submission notification test FAILED');
      }
      
      return result.success;
    } else {
      console.log(`Using provided submission ID: ${submissionId}`);
      
      // Get submission
      const submission = await HomeworkSubmission.findById(submissionId)
        .populate('student', 'name parentPhoneNumber');
      
      if (!submission) {
        console.log(`❌ Submission with ID ${submissionId} not found`);
        return false;
      }
      
      console.log(`Found submission by ${submission.student ? submission.student.name : 'Unknown'}`);
      
      // Override parent phone number for testing if needed
      if (submission.student && phoneNumber) {
        console.log(`Temporarily updating parent phone number to ${phoneNumber} for testing`);
        const originalPhone = submission.student.parentPhoneNumber;
        submission.student.parentPhoneNumber = phoneNumber;
        await submission.student.save();
        
        // Reset after test
        setTimeout(async () => {
          submission.student.parentPhoneNumber = originalPhone;
          await submission.student.save();
          console.log('Reset parent phone number to original value');
        }, 5000);
      }
      
      const result = await notificationService.sendHomeworkSubmissionNotification(submissionId);
      
      console.log('Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Homework submission notification test PASSED');
      } else {
        console.log('❌ Homework submission notification test FAILED');
      }
      
      return result.success;
    }
  } catch (error) {
    console.error('Error in homework submission notification test:', error);
    console.log('❌ Homework submission notification test FAILED with exception');
    return false;
  }
}

/**
 * Test due date reminder
 */
async function testDueDateReminder() {
  console.log('\n=== Testing due date reminder ===');
  
  try {
    // Find a homework assignment
    const homework = await WeekContent.findOne({ type: 'homework' })
      .populate('week');
    
    if (!homework) {
      console.log('❌ No homework assignments found in database');
      return false;
    }
    
    console.log(`Found homework: ${homework.title} for week ${homework.week ? homework.week.weekNumber : 'Unknown'}`);
    
    // Create a test user if needed
    let testUser = await User.findOne({ email: 'test@example.com' });
    
    if (!testUser) {
      console.log('Creating test user for reminder mr.jpg..');
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        age: 15,
        year: homework.week ? homework.week.year : 'Year 10',
        schoolName: 'Test School',
        studentCode: 'TEST123',
        studentPhoneNumber: '1234567890',
        parentPhoneNumber: phoneNumber,
        curriculum: homework.week ? homework.week.curriculum : 'Cambridge',
        studentType: homework.week ? homework.week.studentType : 'School',
        role: 'student',
        isActive: true
      });
      
      await testUser.save();
      console.log('Test user created');
    } else {
      // Update parent phone number
      testUser.parentPhoneNumber = phoneNumber;
      await testUser.save();
      console.log('Updated test user with test phone number');
    }
    
    // Send reminder
    const result = await notificationService.sendDueDateReminders(
      homework.week._id,
      homework._id
    );
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Due date reminder test PASSED');
    } else {
      console.log('❌ Due date reminder test FAILED');
    }
    
    return result.success;
  } catch (error) {
    console.error('Error in due date reminder test:', error);
    console.log('❌ Due date reminder test FAILED with exception');
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    console.log('Starting WhatsApp notification tests...');
    
    // Test direct message
    const directMessageResult = await testDirectMessage();
    
    // Test homework submission notification
    const submissionNotificationResult = await testHomeworkSubmissionNotification();
    
    // Test due date reminder
    const dueDateReminderResult = await testDueDateReminder();
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Direct Message Test: ${directMessageResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Submission Notification Test: ${submissionNotificationResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Due Date Reminder Test: ${dueDateReminderResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Exit
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
