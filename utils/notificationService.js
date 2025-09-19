const User = require('../models/User');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const Week = require('../models/Week');
const WeekContent = require('../models/WeekContent');
const whatsappService = require('./whatsappService');

/**
 * Send homework submission notification to parent
 * @param {string} submissionId - Homework submission ID
 * @returns {Promise<Object>} - Result of sending notification
 */
const sendHomeworkSubmissionNotification = async (submissionId) => {
  try {
    // Find homework submission and populate student and week
    const submission = await HomeworkSubmission.findById(submissionId)
      .populate('student', 'name parentPhoneNumber year schoolName')
      .populate('week', 'title weekNumber');
    
    if (!submission) {
      return {
        success: false,
        error: 'Homework submission not found'
      };
    }
    
    // Check if notification already sent
    if (submission.notifications && submission.notifications.submissionNotified) {
      return {
        success: true,
        message: 'Notification already sent',
        alreadySent: true
      };
    }
    
    // Check if student has parent phone number
    if (!submission.student || !submission.student.parentPhoneNumber) {
      return {
        success: false,
        error: 'Parent phone number not found'
      };
    }
    
    // Use the WhatsApp service to send the notification
    const result = await whatsappService.sendHomeworkSubmissionNotification(submission);
    
    // Update notification status
    submission.notifications = {
      ...submission.notifications || {},
      submissionNotified: result.success,
      submissionNotificationDate: new Date(),
      submissionNotificationStatus: result.success ? 'sent' : 'failed',
    };
    
    if (!result.success) {
      if (!submission.notifications.notificationErrors) {
        submission.notifications.notificationErrors = [];
      }
      submission.notifications.notificationErrors.push(result.error);
    }
    
    await submission.save();
    
    return result;
  } catch (error) {
    console.error('Error sending homework submission notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Send due date reminder to students who haven't submitted homework
 * @param {string} weekId - Week ID
 * @param {string} homeworkId - Homework content ID
 * @returns {Promise<Object>} - Result of sending reminders
 */
const sendDueDateReminders = async (weekId, homeworkId) => {
  try {
    // Find homework assignment
    const homework = await WeekContent.findOne({
      _id: homeworkId,
      week: weekId,
      type: 'homework'
    }).populate('week', 'title weekNumber');
    
    if (!homework) {
      return {
        success: false,
        error: 'Homework assignment not found'
      };
    }
    
    // Check if due date is set
    if (!homework.dueDateTime) {
      return {
        success: false,
        error: 'Homework due date not set'
      };
    }
    
    // Find week details
    const week = await Week.findById(weekId);
    if (!week) {
      return {
        success: false,
        error: 'Week not found'
      };
    }
    
    // Find students who should have access to this week
    // Filter by year and studentType
    const eligibleStudents = await User.find({
      role: 'student',
      isActive: true,
      year: week.year,
      studentType: week.studentType
    });
    
    // Find students who have already submitted
    const submissions = await HomeworkSubmission.find({
      week: weekId,
      materialId: homeworkId
    }).distinct('student');
    
    // Filter out students who have already submitted
    const studentsToNotify = eligibleStudents.filter(student => 
      !submissions.some(submittedId => submittedId.equals(student._id))
    );
    
    console.log(`Found ${studentsToNotify.length} students who haven't submitted homework`);
    
    // Use the WhatsApp service to send reminders
    const result = await whatsappService.sendHomeworkDueReminder(homework, studentsToNotify);
    
    return result;
  } catch (error) {
    console.error('Error sending due date reminders:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Check for upcoming homework deadlines and send reminders
 * This function should be scheduled to run daily
 */
const checkAndSendDueDateReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find homework assignments due tomorrow
    const homeworkDueTomorrow = await WeekContent.find({
      type: 'homework',
      dueDateTime: {
        $gte: now,
        $lte: tomorrow
      }
    }).populate('week', 'title weekNumber');
    
    console.log(`Found ${homeworkDueTomorrow.length} homework assignments due tomorrow`);
    
    let successCount = 0;
    let failureCount = 0;
    const results = [];
    
    // Send reminders for each assignment
    for (const homework of homeworkDueTomorrow) {
      const result = await sendDueDateReminders(homework.week._id, homework._id);
      
      results.push({
        homework: homework.title,
        week: homework.week.title,
        success: result.success,
        studentsNotified: result.success ? result.totalStudents : 0,
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
      processedCount: homeworkDueTomorrow.length,
      successCount,
      failureCount,
      results
    };
  } catch (error) {
    console.error('Error checking and sending due date reminders:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Get list of students who haven't submitted a specific homework
 * @param {string} weekId
 * @param {string} homeworkId
 * @returns {Promise<{success: boolean, homework: any, week: any, students: Array}>}
 */
const getStudentsWhoHaventSubmitted = async (weekId, homeworkId) => {
  try {
    const homework = await WeekContent.findOne({
      _id: homeworkId,
      week: weekId,
      type: 'homework'
    }).populate('week', 'title weekNumber year studentType');

    if (!homework) {
      return { success: false, error: 'Homework assignment not found' };
    }

    const week = await Week.findById(weekId);
    if (!week) {
      return { success: false, error: 'Week not found' };
    }

    const eligibleStudents = await User.find({
      role: 'student',
      isActive: true,
      year: week.year,
      studentType: week.studentType
    }).select('name parentPhoneNumber studentPhoneNumber');

    const submittedStudentIds = await HomeworkSubmission.find({
      week: weekId,
      materialId: homeworkId
    }).distinct('student');

    const students = eligibleStudents.filter(student =>
      !submittedStudentIds.some(id => id.equals(student._id))
    );

    return { success: true, homework, week, students };
  } catch (error) {
    console.error('Error getting students who have not submitted:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendHomeworkSubmissionNotification,
  sendDueDateReminders,
  checkAndSendDueDateReminders,
  getStudentsWhoHaventSubmitted
};
