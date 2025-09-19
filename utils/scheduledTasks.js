const cron = require('node-cron');
const notificationService = require('./notificationService');
const whatsappService = require('./whatsappService');
const WeekContent = require('../models/WeekContent');
const HomeworkSubmission = require('../models/HomeworkSubmission');

/**
 * Schedule tasks to run at specific times
 */
const initScheduledTasks = () => {
  console.log('Initializing scheduled tasks...');
  
  // Check for upcoming homework deadlines every day at 9:00 AM
  // Cron format: minute hour day-of-month month day-of-week
  // cron.schedule('0 9 * * *', async () => {
  //   console.log('Running scheduled task: Check for upcoming homework deadlines');
  //   try {
  //     const result = await notificationService.checkAndSendDueDateReminders();
  //     console.log('Homework deadline check completed:', result);
  //   } catch (error) {
  //     console.error('Error in homework deadline check task:', error);
  //   }
  // });
  
  // Check for missed homework submissions every day at 10:00 AM
  cron.schedule('33 3 * * *', async () => {
    console.log('Running scheduled task: Check for missed homework submissions');
    try {
      await checkMissedHomeworkSubmissions();
    } catch (error) {
      console.error('Error in missed homework check task:', error);
    }
  });
  
  console.log('Scheduled tasks initialized');
};

/**
 * Check for missed homework submissions after due date
 */
const checkMissedHomeworkSubmissions = async () => {
  try {
    const now = new Date();
    
    // Find homework assignments whose due date has passed
    const overdueHomework = await WeekContent.find({
      type: 'homework',
      dueDateTime: { $lt: now }
    }).populate('week', 'title weekNumber');
    
    console.log(`Found ${overdueHomework.length} overdue homework assignments`);
    
    let totalNotificationsSent = 0;
    
    // Process each overdue homework and also build summary per homework
    const summaryItems = [];
    for (const homework of overdueHomework) {
      // Send reminders for students who haven't submitted
      const result = await notificationService.sendDueDateReminders(
        homework.week._id,
        homework._id
      );
      if (result.success) {
        totalNotificationsSent += result.results.filter(r => r.success).length;
      }

      // Build list of students who still haven't submitted
      const missing = await notificationService.getStudentsWhoHaventSubmitted(
        homework.week._id,
        homework._id
      );
      if (missing.success) {
        summaryItems.push({
          week: homework.week,
          homework: { _id: homework._id, title: homework.title },
          year: homework.week.year,
          studentType: homework.week.studentType,
          students: missing.students.map(s => ({ name: s.name }))
        });
      }
    }

    // Send one consolidated message to admin if there are items
    if (summaryItems.length > 0) {
      const adminPhone = process.env.ADMIN_PHONE || '01156012078';
      await whatsappService.sendAdminMissedHomeworkSummary({
        adminPhone,
        items: summaryItems
      });
    }
    
    console.log(`Sent ${totalNotificationsSent} notifications for missed homework submissions`);
    
    return {
      success: true,
      totalNotificationsSent,
      processedHomework: overdueHomework.length
    };
  } catch (error) {
    console.error('Error checking missed homework submissions:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

module.exports = {
  initScheduledTasks,
  checkMissedHomeworkSubmissions
};
