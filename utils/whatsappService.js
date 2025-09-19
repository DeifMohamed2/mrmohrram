const wasender = require('./wasender');

/**
 * Helper function to validate and format phone numbers for WhatsApp
 * @param {string} phoneNumber - The phone number to validate and format
 * @param {string} countryCode - Default country code (without +)
 * @returns {string} - Formatted phone number
 */
const validateAndFormatPhoneNumber = (phoneNumber, countryCode = '20') => {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  // Convert to string if it's not already
  let phone = String(phoneNumber).trim();

  // Remove any non-digit characters
  phone = phone.replace(/\D/g, '');

  // Handle different phone number formats
  if (phone.startsWith('00')) {
    // Remove leading 00 (international format)
    phone = phone.substring(2);
  } else if (phone.startsWith('0')) {
    // Remove leading 0 and add country code
    phone = countryCode + phone.substring(1);
  } else if (!phone.startsWith(countryCode) && phone.length <= 10) {
    // Add country code if it doesn't have one and is a local number
    phone = countryCode + phone;
  }

  // Ensure the number has at least 10 digits (excluding country code)
  if (phone.length < 10) {
    throw new Error(`Phone number too short: ${phoneNumber}`);
  }

  // Ensure the number is not unreasonably long
  if (phone.length > 15) {
    throw new Error(`Phone number too long: ${phoneNumber}`);
  }

  return phone;
};

/**
 * Send WhatsApp message using wasender API
 * @param {string} message - The message to send
 * @param {string} phone - Recipient's phone number
 * @param {Object} options - Additional options
 * @param {string} options.adminPhone - Admin phone number for session selection
 * @param {string} options.countryCode - Country code for phone formatting
 * @param {boolean} options.isTemplate - Whether the message is a template
 * @param {Object} options.templateData - Data for template message
 * @param {string} options.sessionId - Specific session ID to use
 * @returns {Promise<Object>} - Result of sending the message
 */
async function sendWhatsAppMessage(message, phone, options = {}) {
  const {
    adminPhone,
    countryCode = '20',
    isTemplate = false,
    templateData = {},
    sessionId = null,
    attachmentUrl = null,
    attachmentType = null,
    attachmentCaption = null
  } = options;

  try {
    console.log(`Attempting to send WhatsApp message to: ${phone}`);
    
    // Get all sessions to find the one with matching phone number
    const sessionsResponse = await wasender.getAllSessions();
    if (!sessionsResponse.success) {
      throw new Error(`WhatsApp sessions unavailable: ${sessionsResponse.message}`);
    }
    
    const sessions = sessionsResponse.data;
    
    if (!sessions || sessions.length === 0) {
      throw new Error('No WhatsApp sessions found - Please check WhatsApp connection');
    }
    
    let targetSession = null;
    
    // If specific session ID is provided, use that
    if (sessionId) {
      targetSession = sessions.find(s => s.id === sessionId);
      if (!targetSession) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }
    } 
    // Find session by admin phone number
    else if (adminPhone) {
      if (adminPhone === '01156012078') {
        targetSession = sessions.find(s => s.phone_number === '+201156012078' || s.phone_number === '01156012078');
      } else if (adminPhone === '01200077823') {
        targetSession = sessions.find(s => s.phone_number === '+201200077823' || s.phone_number === '01200077823');
      } else if (adminPhone === '01200077829') {
        targetSession = sessions.find(s => s.phone_number === '+201200077829' || s.phone_number === '01200077829');
      }
    }
    
    // If no specific match, try to find any connected session
    if (!targetSession) {
      targetSession = sessions.find(s => s.status === 'connected');
    }
    
    if (!targetSession) {
      // Check if there are sessions but none are connected
      const disconnectedSessions = sessions.filter(s => s.status !== 'connected');
      if (disconnectedSessions.length > 0) {
        const statuses = disconnectedSessions.map(s => `${s.name}: ${s.status}`).join(', ');
        throw new Error(`WhatsApp sessions exist but none are connected. Statuses: ${statuses}`);
      } else {
        throw new Error('WhatsApp not connected - No active session found');
      }
    }
    
    if (!targetSession.api_key) {
      throw new Error('WhatsApp session expired - API key not available');
    }
    
    // Check session status more thoroughly
    if (targetSession.status === 'disconnected') {
      throw new Error('WhatsApp session disconnected - Please reconnect');
    } else if (targetSession.status === 'connecting') {
      throw new Error('WhatsApp session still connecting - Please wait and try again');
    } else if (targetSession.status === 'failed') {
      throw new Error('WhatsApp session failed - Please check connection and try again');
    }
    
    console.log(`Using session: ${targetSession.name} (${targetSession.phone_number})`);
    
    // Debug: Log the original phone number
    console.log('Original phone number:', phone, 'Type:', typeof phone, 'Length:', phone ? phone.length : 'null/undefined');
    
    // Validate and format phone number
    let phoneNumber;
    try {
      phoneNumber = validateAndFormatPhoneNumber(phone, countryCode);
      console.log('Formatted phone number:', phoneNumber, 'Original:', phone);
    } catch (validationError) {
      throw new Error(`Phone number validation failed: ${validationError.message}`);
    }
    
    let response;
    
    // Send the appropriate type of message
    if (attachmentUrl) {
      if (attachmentType === 'image') {
        response = await wasender.sendImageMessage(
          targetSession.api_key, 
          phoneNumber, 
          attachmentUrl, 
          attachmentCaption || message
        );
      } else if (attachmentType === 'document') {
        response = await wasender.sendDocumentMessage(
          targetSession.api_key, 
          phoneNumber, 
          attachmentUrl, 
          attachmentCaption || 'Document'
        );
      } else if (attachmentType === 'video') {
        response = await wasender.sendVideoMessage(
          targetSession.api_key, 
          phoneNumber, 
          attachmentUrl, 
          attachmentCaption || message
        );
      } else if (attachmentType === 'audio') {
        response = await wasender.sendAudioMessage(
          targetSession.api_key, 
          phoneNumber, 
          attachmentUrl
        );
      } else {
        // Default to text message if attachment type is not recognized
        response = await wasender.sendTextMessage(
          targetSession.api_key, 
          phoneNumber, 
          message
        );
      }
    } else {
      // Send regular text message
      response = await wasender.sendTextMessage(
        targetSession.api_key, 
        phoneNumber, 
        message
      );
    }
    
    // Debug: Log the full response for troubleshooting
    console.log('WhatsApp API Response:', JSON.stringify(response, null, 2));
    
    if (!response.success) {
      // Debug: Log the response structure
      console.log('WhatsApp API Error Response:', {
        success: response.success,
        message: response.message,
        error: response.error,
        errorType: typeof response.error,
        errorKeys: response.error && typeof response.error === 'object' ? Object.keys(response.error) : 'N/A'
      });
      
      // Check for specific API errors
      if (response.error) {
        // Convert error to string and check for specific patterns
        const errorStr = String(response.error).toLowerCase();
        
        if (errorStr.includes('not-authorized') || errorStr.includes('unauthorized')) {
          throw new Error('WhatsApp session expired - Please reconnect');
        } else if (errorStr.includes('not-found') || errorStr.includes('notfound') || errorStr.includes('does not exist on whatsapp')) {
          console.log(`WhatsApp Error: Phone number ${phoneNumber} is not registered on WhatsApp`);
          throw new Error('Phone number not registered on WhatsApp - Please check if the recipient has WhatsApp installed');
        } else if (errorStr.includes('blocked') || errorStr.includes('block')) {
          throw new Error('Phone number blocked this WhatsApp account');
        } else if (errorStr.includes('invalid') || errorStr.includes('format')) {
          throw new Error('Invalid phone number format');
        } else if (errorStr.includes('rate-limit') || errorStr.includes('rate limit') || errorStr.includes('too many')) {
          throw new Error('Rate limit exceeded - Please wait before sending more messages');
        } else if (errorStr.includes('timeout')) {
          throw new Error('Request timeout - WhatsApp service slow');
        } else if (errorStr.includes('connection') || errorStr.includes('network')) {
          throw new Error('Network connection issue - Please check internet');
        } else {
          // Try to extract more specific error information
          if (response.details && response.details.error) {
            throw new Error(`WhatsApp API error: ${response.details.error}`);
          } else if (response.status) {
            // Handle specific HTTP status codes
            let errorMessage = 'Unknown error';
            
            if (response.status === 422) {
              // 422 typically means validation error
              if (response.error && typeof response.error === 'object') {
                if (response.error.message) {
                  errorMessage = response.error.message;
                } else if (response.error.error) {
                  errorMessage = response.error.error;
                } else if (response.error.detail) {
                  errorMessage = response.error.detail;
                } else if (response.error.description) {
                  errorMessage = response.error.description;
                } else if (response.error.validation) {
                  errorMessage = `Validation error: ${response.error.validation}`;
                } else if (response.error.constraints) {
                  errorMessage = `Validation failed: ${response.error.constraints}`;
                } else {
                  // Try to find any string value in the object
                  const errorValues = Object.values(response.error).filter(val => typeof val === 'string');
                  if (errorValues.length > 0) {
                    errorMessage = errorValues[0];
                  } else {
                    errorMessage = 'Phone number validation failed';
                  }
                }
              } else if (typeof response.error === 'string') {
                errorMessage = response.error;
              } else {
                errorMessage = 'Phone number validation failed - Check format';
              }
            } else {
              // Handle other status codes
              if (response.error && typeof response.error === 'object') {
                if (response.error.message) {
                  errorMessage = response.error.message;
                } else if (response.error.error) {
                  errorMessage = response.error.error;
                } else if (response.error.detail) {
                  errorMessage = response.error.detail;
                } else if (response.error.description) {
                  errorMessage = response.error.description;
                } else {
                  // Try to find any string value in the object
                  const errorValues = Object.values(response.error).filter(val => typeof val === 'string');
                  if (errorValues.length > 0) {
                    errorMessage = errorValues[0];
                  } else {
                    errorMessage = JSON.stringify(response.error);
                  }
                }
              } else if (typeof response.error === 'string') {
                errorMessage = response.error;
              }
            }
            
            throw new Error(`WhatsApp API error (Status: ${response.status}): ${errorMessage}`);
          } else {
            throw new Error(`WhatsApp API error: ${response.error}`);
          }
        }
      } else {
        // Check if we have additional error details
        if (response.details && response.details.message) {
          throw new Error(`Message sending failed: ${response.details.message}`);
        } else if (response.status) {
          throw new Error(`Message sending failed (Status: ${response.status}): ${response.message}`);
        } else {
          throw new Error(`Message sending failed: ${response.message}`);
        }
      }
    }
    
    return {
      success: true,
      data: response.data,
      message: 'WhatsApp message sent successfully',
      sessionUsed: {
        id: targetSession.id,
        name: targetSession.name,
        phone: targetSession.phone_number
      }
    };
  } catch (err) {
    console.error('Error sending WhatsApp message:', err.message);
    
    // Provide more specific error messages based on error type
    if (err.message.includes('fetch')) {
      throw new Error('Network error - Check internet connection');
    } else if (err.message.includes('timeout')) {
      throw new Error('Request timeout - WhatsApp service may be slow');
    } else if (err.message.includes('ECONNREFUSED')) {
      throw new Error('WhatsApp service unavailable - Please try again later');
    } else if (err.message.includes('ENOTFOUND')) {
      throw new Error('WhatsApp service not found - Check configuration');
    } else {
      // Return a structured error response
      return {
        success: false,
        error: err.message,
        message: 'Failed to send WhatsApp message'
      };
    }
  }
}

/**
 * Send homework submission notification to parent
 * @param {Object} submission - Homework submission object with populated student
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of sending notification
 */
async function sendHomeworkSubmissionNotification(submission, options = {}) {
  try {
    if (!submission || !submission.student) {
      return {
        success: false,
        error: 'Invalid submission or student data missing'
      };
    }

    const student = submission.student;
    const parentPhone = student.parentPhoneNumber;
    
    if (!parentPhone) {
      return {
        success: false,
        error: 'Parent phone number not found'
      };
    }

    // Create bilingual notification message (homework submitted)
    const message = `Dear Parent,
${student.name} has completed the assigned homework. This note is shared to keep you updated on ${student.name}’s academic progress.
_________________
ولي الأمر العزيز،
نفيدكم علماً بأن "${student.name}" قد قام بحل الواجب المطلوب. وتأتي هذه الرسالة لإطلاعكم بشكل مستمر على مستوى تقدم "${student.name}" الدراسي.
_________________
Best regards,
Team X MrMoharram`;

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(message, parentPhone, {
      ...options,
      adminPhone: options.adminPhone || '01156012078' // Default admin phone
    });
    
    // Update notification status in submission if needed
    if (submission.notifications) {
      submission.notifications.submissionNotified = result.success;
      submission.notifications.submissionNotificationDate = new Date();
      submission.notifications.submissionNotificationStatus = result.success ? 'sent' : 'failed';
      
      if (!result.success) {
        if (!submission.notifications.notificationErrors) {
          submission.notifications.notificationErrors = [];
        }
        submission.notifications.notificationErrors.push(result.error);
      }
      
      // Save the submission if it has a save method (mongoose document)
      if (typeof submission.save === 'function') {
        await submission.save();
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error sending homework submission notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send due date reminder to students who haven't submitted homework
 * @param {Object} homework - Homework assignment
 * @param {Array} students - Array of students who haven't submitted
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of sending reminders
 */
async function sendHomeworkDueReminder(homework, students, options = {}) {
  try {
    if (!homework || !students || !Array.isArray(students)) {
      return {
        success: false,
        error: 'Invalid homework or students data'
      };
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each student
    for (const student of students) {
      if (!student.parentPhoneNumber) {
        results.push({
          student: student.name,
          success: false,
          error: 'Parent phone number not found'
        });
        failureCount++;
        continue;
      }

      // Create bilingual reminder message (homework not submitted)
      const message = `Dear Parent,
${student.name} has not completed the assigned homework. This note is shared to keep you updated on ${student.name}’s academic progress.
_________________
ولي الأمر العزيز،
نفيدكم علماً بأن "${student.name}" لم يقم بحل الواجب المطلوب. وتأتي هذه الرسالة لإطلاعكم بشكل مستمر على مستوى تقدم "${student.name}" الدراسي.
_________________
Best regards,
Team X MrMoharram`;

      // Send WhatsApp message
      const result = await sendWhatsAppMessage(message, student.parentPhoneNumber, {
        ...options,
        adminPhone: options.adminPhone || '01156012078' // Default admin phone
      });

      results.push({
        student: student.name,
        success: result.success,
        error: result.error
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: true,
      totalStudents: students.length,
      successCount,
      failureCount,
      results
    };
  } catch (error) {
    console.error('Error sending homework due reminders:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send admin summary message for students who missed homework per homework item
 * @param {Object} summary - { adminPhone, items: [{ week, homework, students: [{name}], year, studentType }] }
 */
async function sendAdminMissedHomeworkSummary(summary) {
  try {
    const { adminPhone, items } = summary;
    if (!adminPhone || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'Invalid summary payload' };
    }

    // Build message(s): one block per homework item
    const blocks = items.map(item => {
      const header = `Message: Week ${item.week.weekNumber} HW for ${item.year} ${item.studentType}\nHW: ${item.homework.title}`;
      const names = item.students.length > 0
        ? item.students.map((s, idx) => `${idx + 1}. ${s.name}`).join('\n')
        : 'No students missing.';
      return `${header}\nList of students:\n${names}`;
    });

    const message = blocks.join('\n\n-----------------------------\n\n');

    const result = await sendWhatsAppMessage(message, adminPhone, { adminPhone });
    return result;
  } catch (error) {
    console.error('Error sending admin missed homework summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check WhatsApp connection status
 * @returns {Promise<Object>} - WhatsApp connection status
 */
async function checkWhatsAppStatus() {
  try {
    const sessionsResponse = await wasender.getAllSessions();
    if (!sessionsResponse.success) {
      return {
        success: false,
        connected: false,
        message: sessionsResponse.message || 'Failed to get WhatsApp sessions'
      };
    }
    
    const sessions = sessionsResponse.data;
    
    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        connected: false,
        message: 'No WhatsApp sessions found'
      };
    }
    
    const connectedSessions = sessions.filter(s => s.status === 'connected');
    
    return {
      success: true,
      connected: connectedSessions.length > 0,
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone_number,
        status: s.status,
        lastActive: s.last_active_at
      })),
      connectedCount: connectedSessions.length,
      totalCount: sessions.length
    };
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return {
      success: false,
      connected: false,
      error: error.message || 'Unknown error'
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendHomeworkSubmissionNotification,
  sendHomeworkDueReminder,
  checkWhatsAppStatus,
  validateAndFormatPhoneNumber,
  sendAdminMissedHomeworkSummary
};
