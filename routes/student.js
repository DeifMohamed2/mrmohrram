const express = require('express');
const router = express.Router();
const multer = require('multer');
const { isAuthenticated } = require('../middlewares/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and image files are allowed.'), false);
    }
  }
});
const {
  getStudentDashboard,
  getYearSelection,
  updateYearAndMode,
  getLearningContent,
  getWeekDetails,
  downloadNote,
  downloadPastPaper,
  getWeekContent,
  submitHomework,
  getHomeworkSubmission,
  getSecurePDF,
  downloadPDF,
  markContentAsCompleted,
  previewPastPaper,
  getPastPapersForStudent,
  viewPastPaper,
} = require('../controllers/studentController');

// Student Dashboard - Main page
router.get('/dashboard', isAuthenticated, getStudentDashboard);

// Year Selection Page
router.get('/year-selection', isAuthenticated, getYearSelection);

// Update Year and Learning Mode
router.post('/update-selection', isAuthenticated, updateYearAndMode);

// Learning Content Page
router.get('/learning/:year/:mode', isAuthenticated, getLearningContent);

// Week Content Page
router.get('/week/:weekId', isAuthenticated, getWeekContent);

// Past Paper Viewing Page
router.get('/past-paper/:paperId', isAuthenticated, viewPastPaper);

// API Routes for dynamic content
router.get('/api/week/:weekId', isAuthenticated, getWeekDetails);
router.get('/api/weeks/:weekId/content', isAuthenticated, getWeekContent);
router.get('/api/note/:noteId/download', isAuthenticated, downloadNote);
router.get('/api/past-papers', isAuthenticated, getPastPapersForStudent);
router.get('/api/past-papers/:paperId/preview', isAuthenticated, previewPastPaper);
router.get('/api/past-papers/:paperId/download', isAuthenticated, downloadPastPaper);

// Homework submission routes
router.post('/api/homework/submit', isAuthenticated, upload.single('file'), submitHomework);
router.get('/api/homework/:submissionId', isAuthenticated, getHomeworkSubmission);

// Secure PDF viewing route
router.get('/api/secure-pdf/:materialId', isAuthenticated, getSecurePDF);

// PDF download route
router.get('/api/download-pdf/:materialId', isAuthenticated, downloadPDF);

// Mark content as completed route
router.post('/api/mark-content-completed', isAuthenticated, markContentAsCompleted);

module.exports = router;
