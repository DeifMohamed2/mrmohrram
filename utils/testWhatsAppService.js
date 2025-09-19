/**
 * Test script for WhatsApp service
 * 
 * This script demonstrates how to use the WhatsApp service for sending messages
 * 
 * Usage:
 * node testWhatsAppService.js [phoneNumber] [adminPhone]
 * 
 * Example:
 * node testWhatsAppService.js 01156012078 01200077825
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const whatsappService = require('./whatsappService');

// Load environment variables
dotenv.config();

// Get command line arguments
const args = process.argv.slice(2);
const phoneNumber = args[0] || '01156012078'; // Default test number
const adminPhone = args[1] || '01156012078'; // Default admin phone

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mr-moharr7am')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Test WhatsApp connection status
 */
async function testWhatsAppStatus() {
  console.log('\n=== Testing WhatsApp Connection Status ===');
  
  try {
    const result = await whatsappService.checkWhatsAppStatus();
    console.log('Status result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.connected) {
      console.log('✅ WhatsApp is connected with', result.connectedCount, 'active sessions');
    } else {
      console.log('❌ WhatsApp is not connected');
    }
    
    return result.success && result.connected;
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    console.log('❌ WhatsApp status check failed');
    return false;
  }
}

/**
 * Test sending a simple text message
 */
async function testSendTextMessage() {
  console.log('\n=== Testing Text Message ===');
  
  try {
    const message = `This is a test message from Mr. Moharr7am WhatsApp Service. Time: ${new Date().toLocaleString()}`;
    console.log(`Sending message to ${phoneNumber} using admin phone ${adminPhone}:`);
    console.log(message);
    
    const result = await whatsappService.sendWhatsAppMessage(message, phoneNumber, {
      adminPhone: adminPhone,
      countryCode: '20'
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Text message test PASSED');
    } else {
      console.log('❌ Text message test FAILED:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('Error sending text message:', error);
    console.log('❌ Text message test FAILED with exception');
    return false;
  }
}

/**
 * Test sending a message with an image
 */
async function testSendImageMessage() {
  console.log('\n=== Testing Image Message ===');
  
  try {
    const message = `This is a test image message from Mr. Moharr7am WhatsApp Service. Time: ${new Date().toLocaleString()}`;
    const imageUrl = 'https://via.placeholder.com/300x200?text=Test+Image';
    
    console.log(`Sending image message to ${phoneNumber} using admin phone ${adminPhone}`);
    
    const result = await whatsappService.sendWhatsAppMessage(message, phoneNumber, {
      adminPhone: adminPhone,
      countryCode: '20',
      attachmentUrl: imageUrl,
      attachmentType: 'image',
      attachmentCaption: message
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Image message test PASSED');
    } else {
      console.log('❌ Image message test FAILED:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('Error sending image message:', error);
    console.log('❌ Image message test FAILED with exception');
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    console.log('Starting WhatsApp service tests...');
    
    // Test WhatsApp status
    const statusResult = await testWhatsAppStatus();
    
    // Only proceed with other tests if WhatsApp is connected
    let textMessageResult = false;
    let imageMessageResult = false;
    
    if (statusResult) {
      // Test text message
      textMessageResult = await testSendTextMessage();
      
      // Test image message
      imageMessageResult = await testSendImageMessage();
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`WhatsApp Status: ${statusResult ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
    console.log(`Text Message: ${textMessageResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Image Message: ${imageMessageResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Exit
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
