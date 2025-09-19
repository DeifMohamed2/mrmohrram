const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    const allowedExtensions = /\.(pdf|doc|docx|txt|jpg|jpeg|png)$/i;
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.test(file.originalname)) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, TXT, and image files are allowed'));
    }
  }
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admin privileges required.');
  res.redirect('/auth/login');
};

// Admin Dashboard
router.get('/dashboard', isAdmin, adminController.getAdminDashboard);

// User Management Routes
router.get('/manage-users', isAdmin, adminController.getManageUsers);
router.post(
  '/users/:userId/toggle-status',
  isAdmin,
  adminController.toggleUserStatus
);

// Week Management Routes
router.get('/manage-weeks', isAdmin, adminController.getManageWeeks);
router.post('/weeks/create', isAdmin, adminController.createWeek);
router.post('/weeks/:weekId/toggle-status', isAdmin, adminController.toggleWeekStatus);
router.get('/weeks/:weekId', isAdmin, adminController.getWeekDetails);

// User Management Routes - Additional
router.post('/users/create', isAdmin, adminController.createUser);
router.get('/users/:userId', isAdmin, adminController.getUserDetails);

// Homework Management Routes
router.get('/homework', isAdmin, adminController.getHomework);

// Notes Management Routes
router.get('/notes', isAdmin, adminController.getNotes);
router.post('/notes/create', isAdmin, adminController.createNote);

// Past Papers Management Routes
router.get('/past-papers', isAdmin, adminController.getPastPapers);
router.post('/past-papers/create', isAdmin, upload.single('paperFile'), adminController.createPastPaper);
router.get('/past-papers/:paperId', isAdmin, adminController.getPastPaperDetails);
router.get('/past-papers/:paperId/download', isAdmin, adminController.downloadPastPaperAdmin);
router.put('/past-papers/:paperId', isAdmin, upload.single('paperFile'), adminController.updatePastPaper);
router.delete('/past-papers/:paperId', isAdmin, adminController.deletePastPaper);
router.put('/past-papers/:paperId/toggle-status', isAdmin, adminController.togglePastPaperStatus);
router.put('/past-papers/:paperId/access', isAdmin, adminController.updatePastPaperAccess);
router.post('/past-papers/:paperId/answer-key', isAdmin, upload.single('answerKeyFile'), adminController.addAnswerKey);
router.post('/past-papers/:paperId/marking-scheme', isAdmin, upload.single('markingSchemeFile'), adminController.addMarkingScheme);

// Year Content Management Routes
router.get('/year-content', isAdmin, adminController.getYearContent);
router.post('/year-content/create', isAdmin, adminController.createYearContent);

// Progress Tracking Routes
router.get('/progress', isAdmin, adminController.getProgress);

// Restrictions Management Routes
router.get('/restrictions', isAdmin, adminController.getRestrictions);

// Settings Routes
router.get('/settings', isAdmin, adminController.getSettings);
router.post('/settings/update', isAdmin, adminController.updateSettings);

// API Routes for AJAX calls

// Students API
router.get('/api/students', isAdmin, adminController.getStudentsAPI);
router.get('/api/users/:userId', isAdmin, adminController.getUserDetails);

// Weeks API
router.get('/api/weeks', isAdmin, adminController.getWeeksAPI);

// Homework API
router.get('/api/homework/:submissionId', isAdmin, adminController.getHomeworkSubmissionAPI);
router.post('/api/homework/:submissionId/grade', isAdmin, adminController.gradeHomeworkSubmissionAPI);
router.delete('/api/homework/:submissionId', isAdmin, adminController.deleteHomeworkSubmissionAPI);
router.get('/api/homework/orphaned', isAdmin, adminController.getOrphanedHomeworkAPI);
router.delete('/api/homework/cleanup-orphaned', isAdmin, adminController.cleanupOrphanedHomeworkAPI);

// WhatsApp Notification API
router.post('/api/homework/:submissionId/send-notification', isAdmin, adminController.sendHomeworkNotificationAPI);
router.post('/api/homework/:weekId/:homeworkId/send-reminders', isAdmin, adminController.sendDueDateRemindersAPI);
router.post('/api/students/:studentId/send-message', isAdmin, adminController.sendCustomMessageAPI);

// Progress API
router.get('/api/students/:studentId/progress', isAdmin, adminController.getStudentProgressAPI);
router.put('/api/students/:studentId/progress', isAdmin, adminController.updateStudentProgressAPI);
router.post('/api/students/:studentId/reminder', isAdmin, adminController.sendStudentReminderAPI);

// Restrictions API
router.put('/api/students/:studentId/restrictions', isAdmin, adminController.toggleStudentRestrictionAPI);
router.get('/api/students/:studentId/week-restrictions', isAdmin, adminController.getStudentWeekRestrictionsAPI);
router.put('/api/students/:studentId/week-restrictions', isAdmin, adminController.updateStudentWeekRestrictionsAPI);
router.delete('/api/students/:studentId/restrictions', isAdmin, adminController.clearStudentRestrictionsAPI);

// Settings API
router.get('/api/settings', isAdmin, adminController.getSettingsAPI);
router.put('/api/settings', isAdmin, adminController.updateSettingsAPI);

// Dashboard API
router.get('/api/statistics', isAdmin, adminController.getStatisticsAPI);
router.get('/api/recent-activity', isAdmin, adminController.getRecentActivityAPI);
router.get('/api/badges', isAdmin, adminController.getBadgesAPI);

// Weeks API
router.post('/api/weeks', isAdmin, adminController.createWeek);
router.get('/api/weeks/:weekId', isAdmin, adminController.getWeekDetails);
router.put('/api/weeks/:weekId', isAdmin, adminController.updateWeek);
router.put('/api/weeks/:weekId/status', isAdmin, adminController.toggleWeekStatus);
router.delete('/api/weeks/:weekId', isAdmin, adminController.deleteWeek);

// Week Content API
router.get('/api/weeks/:weekId/content', isAdmin, adminController.getWeekContent);
router.post('/api/weeks/:weekId/content', isAdmin, upload.single('file'), adminController.addWeekContent);
router.put('/api/content/:contentId', isAdmin, upload.single('file'), adminController.updateWeekContent);
router.delete('/api/content/:contentId', isAdmin, adminController.deleteWeekContent);

// Week Materials API
router.put('/api/weeks/:weekId/materials/:materialId', isAdmin, upload.single('file'), adminController.updateWeekMaterial);

// Week Content Management Page
router.get('/week-content', isAdmin, (req, res) => {
  res.render('Admin/week-content', {
    title: 'Week Content Management',
    user: req.session.user,
    page: 'week-content',
    layout: false,
  });
});

// Test Cloudinary connection
router.get('/test-cloudinary', isAdmin, async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;
    const result = await cloudinary.api.ping();
    res.json({ 
      success: true, 
      message: 'Cloudinary connection successful',
      result: result
    });
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Cloudinary connection failed',
      error: error.message
    });
  }
});

// Cleanup routes
router.post('/api/cleanup-content/:weekId', isAdmin, async (req, res) => {
  try {
    const { weekId } = req.params;
    await adminController.cleanupOrphanedContent(weekId);
    res.json({ success: true, message: 'Content cleanup completed' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, message: 'Cleanup failed' });
  }
});

// Legacy routes for backward compatibility
router.get('/users', isAdmin, adminController.getManageUsers);
router.get('/content', isAdmin, adminController.getManageWeeks);

module.exports = router;
