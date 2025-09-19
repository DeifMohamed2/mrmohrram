const User = require('../models/User');
const Week = require('../models/Week');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const StudentProgress = require('../models/StudentProgress');
const Restriction = require('../models/Restriction');
const PastPaper = require('../models/PastPaper');
const YearContent = require('../models/YearContent');
const Note = require('../models/Note');
const WeekContent = require('../models/WeekContent');
const cloudinary = require('cloudinary').v2;

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (file, folder = 'mr-mohrr7am', fileType = 'auto') => {
  try {
    console.log('Uploading file to Cloudinary:', { fileType, folder });
    
    // Determine resource type based on file type
    let resourceType = 'auto';
    if (fileType.includes('pdf')) {
      resourceType = 'raw';
    } else if (fileType.includes('image')) {
      resourceType = 'image';
    } else if (fileType.includes('text') || fileType.includes('document')) {
      resourceType = 'raw';
    }

    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
      upload_preset: 'order_project',
      use_filename: true,
      unique_filename: false
    };

    // For PDFs and documents, add specific options
    if (resourceType === 'raw') {
      uploadOptions.resource_type = 'raw';
      uploadOptions.type = 'upload';
    }

    console.log('Upload options:', uploadOptions);

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    console.log('Upload successful:', result.secure_url);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Try alternative upload method for PDFs
    if (fileType.includes('pdf')) {
      try {
        console.log('Trying alternative PDF upload method...');
        const result = await cloudinary.uploader.upload(file, {
          folder: folder,
          resource_type: 'raw',
          upload_preset: 'order_project',
          use_filename: true,
          unique_filename: false,
          type: 'upload'
        });
        
        return {
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
          resourceType: result.resource_type
        };
      } catch (retryError) {
        console.error('Retry upload also failed:', retryError);
        return {
          success: false,
          error: `PDF upload failed: ${retryError.message}`
        };
      }
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// GET - Admin Dashboard
const getAdminDashboard = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      req.flash('error_msg', 'Please log in to access the admin dashboard');
      return res.redirect('/auth/login');
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      req.flash('error_msg', 'Access denied. Admin privileges required.');
      return res.redirect('/student/dashboard');
    }

    // Get comprehensive dashboard statistics
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalWeeks = await Week.countDocuments({});
    const pendingHomework = await HomeworkSubmission.countDocuments({
      status: 'pending',
    });
    const completedHomework = await HomeworkSubmission.countDocuments({
      status: 'completed',
    });
    const pendingUsers = await User.countDocuments({ 
      role: 'student', 
      isActive: false 
    });

    // Get recent students (last 5)
    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent activity (mock data for now)
    const recentActivity = [
      {
        user: { name: 'Ahmed Mohammed' },
        action: 'Homework Submitted',
        details: 'Week 5 Mathematics Assignment',
        timestamp: new Date(),
      },
      {
        user: { name: 'Sara Ali' },
        action: 'Profile Updated',
        details: 'Changed profile information',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        user: { name: 'Omar Hassan' },
        action: 'Progress Update',
        details: 'Completed Week 4 assessments',
        timestamp: new Date(Date.now() - 7200000),
      },
    ];

    const stats = {
      totalStudents,
      totalWeeks,
      pendingHomework,
      completedHomework,
      pendingUsers,
    };

    console.log('Admin Dashboard Data:', {
      user: user.name,
      stats,
      recentStudentsCount: recentStudents.length,
      recentActivityCount: recentActivity.length
    });

    res.render('Admin/dashboard', {
      title: 'Admin Dashboard',
      user,
      stats,
      recentStudents,
      recentActivity,
      page: 'dashboard',
      layout: false,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash(
      'error_msg',
      'An error occurred while loading the admin dashboard'
    );
    res.redirect('/auth/login');
  }
};

// GET - Manage Users
const getManageUsers = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;

    // Build query based on status filter
    let query = { role: 'student' };
    if (statusFilter === 'pending') {
      query.isActive = false;
    } else if (statusFilter === 'active') {
      query.isActive = true;
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    res.render('Admin/manage-users', {
      title: 'Manage Users',
      user,
      users,
      currentPage: page,
      totalPages,
      totalUsers,
      page: 'users',
      layout: false,
    });
  } catch (error) {
    console.error('Manage users error:', error);
    req.flash('error_msg', 'An error occurred while loading users');
    res.redirect('/admin/dashboard');
  }
};

// GET - Manage Weeks
const getManageWeeks = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const weeks = await Week.find({}).sort({ weekNumber: 1 });

    res.render('Admin/manage-weeks', {
      title: 'Manage Weeks',
      user,
      weeks,
      page: 'weeks',
      layout: false,
    });
  } catch (error) {
    console.error('Manage weeks error:', error);
    req.flash('error_msg', 'An error occurred while loading weeks');
    res.redirect('/admin/dashboard');
  }
};

// GET - Homework Management
const getHomework = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    // Get query parameters for filtering
    const { year, studentType, status, notificationStatus } = req.query;
    
    // Build filter query
    const filter = {};
    
    // Apply filters to the query
    let homeworkQuery = HomeworkSubmission.find(filter)
      .populate('student', 'name email year studentType parentPhoneNumber')
      .populate('week', 'title weekNumber year studentType')
      .sort({ submissionDate: -1 });
    
    // Execute query
    const homework = await homeworkQuery;

    // Filter out submissions where week population failed (week is null)
    // This can happen if the referenced week was deleted
    let validHomework = homework.filter(submission => submission.week !== null);
    
    // Apply post-query filters (for populated fields)
    if (year) {
      validHomework = validHomework.filter(h => h.week && h.week.year === year);
    }
    
    if (studentType) {
      validHomework = validHomework.filter(h => h.student && h.student.studentType === studentType);
    }
    
    if (status) {
      validHomework = validHomework.filter(h => h.status === status);
    }
    
    if (notificationStatus) {
      if (notificationStatus === 'sent') {
        validHomework = validHomework.filter(h => 
          h.notifications && h.notifications.submissionNotified === true
        );
      } else if (notificationStatus === 'pending') {
        validHomework = validHomework.filter(h => 
          !h.notifications || h.notifications.submissionNotified === false
        );
      } else if (notificationStatus === 'failed') {
        validHomework = validHomework.filter(h => 
          h.notifications && h.notifications.submissionNotificationStatus === 'failed'
        );
      }
    }
    
    // Log any submissions with missing weeks for debugging
    const invalidSubmissions = homework.filter(submission => submission.week === null);
    if (invalidSubmissions.length > 0) {
      console.warn(`Found ${invalidSubmissions.length} homework submissions with missing week references:`, 
        invalidSubmissions.map(s => ({ id: s._id, weekId: s.week })));
    }

    // Calculate statistics
    const totalSubmissions = validHomework.length;
    const pendingSubmissions = validHomework.filter(h => h.status === 'submitted' || h.status === 'late').length;
    const gradedSubmissions = validHomework.filter(h => h.status === 'graded').length;
    
    // Calculate average score
    const scoredSubmissions = validHomework.filter(h => h.grade && h.grade.percentage !== undefined);
    const averageScore = scoredSubmissions.length > 0 
      ? Math.round(scoredSubmissions.reduce((sum, h) => sum + h.grade.percentage, 0) / scoredSubmissions.length)
      : 0;

    // Get unique years and student types for filter dropdowns
    const years = [...new Set(validHomework.filter(h => h.week && h.week.year).map(h => h.week.year))];
    const studentTypes = [...new Set(validHomework.filter(h => h.student && h.student.studentType).map(h => h.student.studentType))];

    // Transform homework data to match view expectations
    const transformedHomework = validHomework.map(submission => ({
      ...submission.toObject(),
      // Map submissionDate to submittedAt for view compatibility
      submittedAt: submission.submissionDate,
      // Map grade.percentage to score for view compatibility
      score: submission.grade && submission.grade.percentage !== undefined ? submission.grade.percentage : null,
      // Map feedback.text to feedback for view compatibility
      feedback: submission.feedback && submission.feedback.text ? submission.feedback.text : null,
      // Ensure status is properly formatted
      status: submission.status || 'submitted',
      // Add notification status
      notificationStatus: submission.notifications ? (
        submission.notifications.submissionNotified ? 'Sent' : 
        (submission.notifications.submissionNotificationStatus === 'failed' ? 'Failed' : 'Pending')
      ) : 'Not Attempted',
      // Add notification date if available
      notificationDate: submission.notifications && submission.notifications.submissionNotificationDate ? 
        submission.notifications.submissionNotificationDate : null
    }));

    res.render('Admin/homework', {
      title: 'Homework Management',
      user,
      homework: transformedHomework,
      statistics: {
        totalSubmissions,
        pendingSubmissions,
        gradedSubmissions,
        averageScore
      },
      filters: {
        years,
        studentTypes,
        selectedYear: year || '',
        selectedStudentType: studentType || '',
        selectedStatus: status || '',
        selectedNotificationStatus: notificationStatus || ''
      },
      page: 'homework',
      layout: false,
    });
  } catch (error) {
    console.error('Homework error:', error);
    req.flash('error_msg', 'An error occurred while loading homework');
    res.redirect('/admin/dashboard');
  }
};

// GET - Notes Management
const getNotes = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const notes = await Note.find({})
      .populate('week', 'title weekNumber year studentType')
      .sort({ createdAt: -1 });

    res.render('Admin/notes', {
      title: 'Notes Management',
      user,
      notes,
      page: 'notes',
      layout: false,
    });
  } catch (error) {
    console.error('Notes error:', error);
    req.flash('error_msg', 'An error occurred while loading notes');
    res.redirect('/admin/dashboard');
  }
};

// GET - Progress Tracking
const getProgress = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const students = await User.find({ role: 'student' })
      .select('name email year studentType currentWeek totalProgress completedWeeks statistics lastLogin isActive restrictions')
      .sort({ name: 1 });

    res.render('Admin/progress', {
      title: 'Student Progress',
      user,
      students,
      page: 'progress',
      layout: false,
    });
  } catch (error) {
    console.error('Progress error:', error);
    req.flash('error_msg', 'An error occurred while loading progress data');
    res.redirect('/admin/dashboard');
  }
};

// GET - Restrictions Management
const getRestrictions = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const students = await User.find({ role: 'student' })
      .select('name email year studentType restrictions')
      .sort({ name: 1 });

    res.render('Admin/restrictions', {
      title: 'Restrictions Management',
      user,
      students,
      page: 'restrictions',
      layout: false,
    });
  } catch (error) {
    console.error('Restrictions error:', error);
    req.flash('error_msg', 'An error occurred while loading restrictions');
    res.redirect('/admin/dashboard');
  }
};

// GET - Settings
const getSettings = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    // Get system settings (mock data for now)
    const settings = {
      siteName: 'Mr Mohrr7am Education Platform',
      siteDescription: 'Advanced Mathematics Learning Platform',
      enableRegistration: true,
      enableNotifications: true,
      maintenanceMode: false,
      maxFileSize: '10MB',
      allowedFileTypes: ['pdf', 'docx', 'txt', 'jpg', 'png'],
    };

    res.render('Admin/settings', {
      title: 'System Settings',
      user,
      settings,
      page: 'settings',
      layout: false,
    });
  } catch (error) {
    console.error('Settings error:', error);
    req.flash('error_msg', 'An error occurred while loading settings');
    res.redirect('/admin/dashboard');
  }
};

// POST - Activate/Deactivate User
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (action === 'activate') {
      targetUser.isActive = true;
      await targetUser.save();
      req.flash(
        'success_msg',
        `${targetUser.name} has been activated successfully`
      );
    } else if (action === 'deactivate') {
      targetUser.isActive = false;
      await targetUser.save();
      req.flash(
        'success_msg',
        `${targetUser.name} has been deactivated successfully`
      );
    }

    res.redirect('/admin/manage-users');
  } catch (error) {
    console.error('Toggle user status error:', error);
    req.flash('error_msg', 'An error occurred while updating user status');
    res.redirect('/admin/manage-users');
  }
};

// POST - Create Week
const createWeek = async (req, res) => {
  try {
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      weekNumber,
      title,
      description,
      year,
      curriculum,
      studentType,
      startDate,
      endDate,
      materials,
      isActive,
      unlockConditions
    } = req.body;

    // Validate required fields
    if (!weekNumber || !title || !description || !year || !curriculum || !studentType || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be provided' 
      });
    }

    // Check if week number already exists for the same year/curriculum/studentType
    const existingWeek = await Week.findOne({
      weekNumber,
      year,
      curriculum,
      studentType
    });

    if (existingWeek) {
      return res.status(400).json({
        success: false,
        message: `Week ${weekNumber} already exists for ${year} ${curriculum} ${studentType} students`
      });
    }

    // Get the user ID from the session (session stores it as 'id', not '_id')
    let createdById = user.id;
    
    // If still no ID, find the first admin user
    if (!createdById) {
      const adminUser = await User.findOne({ role: 'admin' });
      createdById = adminUser ? adminUser._id : null;
    }

    if (!createdById) {
      return res.status(500).json({ 
        success: false, 
        message: 'Unable to determine creator. Please ensure you are logged in as an admin.' 
      });
    }

    // Process materials array to ensure proper structure
    let processedMaterials = [];
    if (materials && Array.isArray(materials)) {
      processedMaterials = materials.map(material => ({
        type: material.type,
        title: material.title,
        description: material.description || '',
        fileUrl: material.fileUrl || '',
        isRequired: material.isRequired === 'true' || material.isRequired === true,
        dueDate: material.dueDate ? new Date(material.dueDate) : null,
        maxScore: parseInt(material.maxScore) || 100
      }));
    }

    // Process unlock conditions
    const processedUnlockConditions = {
      requiresPreviousWeek: unlockConditions?.requiresPreviousWeek === 'true' || unlockConditions?.requiresPreviousWeek === true,
      requiredCompletionPercentage: parseInt(unlockConditions?.requiredCompletionPercentage || 100),
      autoUnlock: unlockConditions?.autoUnlock === 'true' || unlockConditions?.autoUnlock === true,
      dependsOnPreviousWeek: unlockConditions?.dependsOnPreviousWeek === 'true' || unlockConditions?.dependsOnPreviousWeek === true,
      manualUnlockOnly: unlockConditions?.manualUnlockOnly === 'true' || unlockConditions?.manualUnlockOnly === true
    };

    // Process specific week dependencies if they exist
    if (unlockConditions?.specificWeekDependencies) {
      processedUnlockConditions.specificWeekDependencies = [];
      
      // Convert to array if it's not already
      const dependencies = Array.isArray(unlockConditions.specificWeekDependencies) 
        ? unlockConditions.specificWeekDependencies 
        : Object.values(unlockConditions.specificWeekDependencies);
      
      dependencies.forEach(dependency => {
        if (dependency.weekNumber) {
          processedUnlockConditions.specificWeekDependencies.push({
            weekNumber: parseInt(dependency.weekNumber),
            requiredCompletion: parseInt(dependency.requiredCompletion || 100)
          });
        }
      });
    }

    const newWeek = new Week({
      weekNumber: parseInt(weekNumber),
      title,
      description,
      year,
      curriculum,
      studentType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive === 'true' || isActive === true,
      materials: processedMaterials,
      unlockConditions: processedUnlockConditions,
      createdBy: createdById,
    });

    await newWeek.save();
    
    res.json({ 
      success: true, 
      message: 'Week created successfully',
      week: newWeek
    });
  } catch (error) {
    console.error('Create week error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while creating the week' 
    });
  }
};

// POST - Toggle Week Status
const toggleWeekStatus = async (req, res) => {
  try {
    const { weekId } = req.params;
    const { action } = req.body;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const week = await Week.findById(weekId);
    if (!week) {
      return res.status(404).json({ 
        success: false, 
        message: 'Week not found' 
      });
    }

    if (action === 'activate') {
      week.isActive = true;
    } else if (action === 'deactivate') {
      week.isActive = false;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action' 
      });
    }

    await week.save();
    
    res.json({ 
      success: true, 
      message: `Week ${action}d successfully`
    });
  } catch (error) {
    console.error('Toggle week status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating week status' 
    });
  }
};

// GET - Week Details
const getWeekDetails = async (req, res) => {
  try {
    const { weekId } = req.params;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const week = await Week.findById(weekId).populate('createdBy', 'name');
    if (!week) {
      return res.status(404).json({ 
        success: false, 
        message: 'Week not found' 
      });
    }

    // Return week details as JSON or render a partial view
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ success: true, week });
    } else {
      // Render a partial view for the modal
      res.render('Admin/partials/week-details', { week });
    }
  } catch (error) {
    console.error('Get week details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while loading week details' 
    });
  }
};

// PUT - API: Update Week
const updateWeek = async (req, res) => {
  try {
    const { weekId } = req.params;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      weekNumber,
      title,
      description,
      year,
      curriculum,
      studentType,
      startDate,
      endDate,
      materials,
      isActive,
      unlockConditions
    } = req.body;

    // Validate required fields
    if (!weekNumber || !title || !description || !year || !curriculum || !studentType || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be provided' 
      });
    }

    const week = await Week.findById(weekId);
    if (!week) {
      return res.status(404).json({ 
        success: false, 
        message: 'Week not found' 
      });
    }

    // Check if week number already exists for the same year/curriculum/studentType (excluding current week)
    const existingWeek = await Week.findOne({
      weekNumber,
      year,
      curriculum,
      studentType,
      _id: { $ne: weekId }
    });

    if (existingWeek) {
      return res.status(400).json({
        success: false,
        message: `Week ${weekNumber} already exists for ${year} ${curriculum} ${studentType} students`
      });
    }

    // Process materials array to ensure proper structure
    let processedMaterials = [];
    if (materials && Array.isArray(materials)) {
      processedMaterials = materials.map(material => ({
        type: material.type,
        title: material.title,
        description: material.description || '',
        fileUrl: material.fileUrl || '',
        isRequired: material.isRequired === 'true' || material.isRequired === true,
        dueDate: material.dueDate ? new Date(material.dueDate) : null,
        maxScore: parseInt(material.maxScore) || 100
      }));
    }

    // Process unlock conditions
    if (unlockConditions) {
      week.unlockConditions = {
        requiresPreviousWeek: unlockConditions.requiresPreviousWeek === 'true' || unlockConditions.requiresPreviousWeek === true,
        requiredCompletionPercentage: parseInt(unlockConditions.requiredCompletionPercentage || 100),
        autoUnlock: unlockConditions.autoUnlock === 'true' || unlockConditions.autoUnlock === true,
        dependsOnPreviousWeek: unlockConditions.dependsOnPreviousWeek === 'true' || unlockConditions.dependsOnPreviousWeek === true,
        manualUnlockOnly: unlockConditions.manualUnlockOnly === 'true' || unlockConditions.manualUnlockOnly === true
      };
      
      // Process specific week dependencies if they exist
      if (unlockConditions.specificWeekDependencies) {
        week.unlockConditions.specificWeekDependencies = [];
        
        // Convert to array if it's not already
        const dependencies = Array.isArray(unlockConditions.specificWeekDependencies) 
          ? unlockConditions.specificWeekDependencies 
          : Object.values(unlockConditions.specificWeekDependencies);
        
        dependencies.forEach(dependency => {
          if (dependency.weekNumber) {
            week.unlockConditions.specificWeekDependencies.push({
              weekNumber: parseInt(dependency.weekNumber),
              requiredCompletion: parseInt(dependency.requiredCompletion || 100)
            });
          }
        });
      }
    }

    // Update week
    week.weekNumber = parseInt(weekNumber);
    week.title = title;
    week.description = description;
    week.year = year;
    week.curriculum = curriculum;
    week.studentType = studentType;
    week.startDate = new Date(startDate);
    week.endDate = new Date(endDate);
    week.isActive = isActive === 'true' || isActive === true;
    week.materials = processedMaterials;
    week.updatedAt = new Date();

    await week.save();
    
    res.json({ 
      success: true, 
      message: 'Week updated successfully',
      week: week
    });
  } catch (error) {
    console.error('Update week error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating the week' 
    });
  }
};

// DELETE - API: Delete Week
const deleteWeek = async (req, res) => {
  try {
    const { weekId } = req.params;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const week = await Week.findById(weekId);
    if (!week) {
      return res.status(404).json({ 
        success: false, 
        message: 'Week not found' 
      });
    }

    // First delete all associated WeekContent entries
    console.log(`Deleting all WeekContent entries for week ${weekId}`);
    const deleteContentResult = await WeekContent.deleteMany(
      { week: weekId }
    );
    console.log(`Deleted ${deleteContentResult.deletedCount} WeekContent entries`);
    
    // Then delete the week itself
    await Week.findByIdAndDelete(weekId);
    
    res.json({ 
      success: true, 
      message: 'Week and all associated content deleted successfully'
    });
  } catch (error) {
    console.error('Delete week error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while deleting the week' 
    });
  }
};

// POST - Create User
const createUser = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      name,
      email,
      password,
      age,
      year,
      schoolName,
      studentPhoneNumber,
      parentPhoneNumber,
      curriculum,
      studentType,
      isActive
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !age || !year || !schoolName || !studentPhoneNumber || !parentPhoneNumber || !curriculum || !studentType) {
      return res.status(400).json({ 
        success: false, 
        message: 'All required fields must be provided' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    const newUser = new User({
      name,
      email,
      password, // Note: In a real app, this should be hashed
      age: parseInt(age),
      year,
      schoolName,
      studentPhoneNumber,
      parentPhoneNumber,
      curriculum,
      studentType,
      role: 'student',
      isActive: isActive === 'true' || isActive === true,
    });

    await newUser.save();
    
    res.json({ 
      success: true, 
      message: 'Student created successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        year: newUser.year,
        curriculum: newUser.curriculum,
        studentType: newUser.studentType,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while creating the student' 
    });
  }
};

// GET - User Details
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = req.session.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get user's progress and submissions
    const progress = await StudentProgress.find({ student: userId })
      .populate('week', 'title weekNumber')
      .sort({ updatedAt: -1 })
      .limit(10);

    const submissions = await HomeworkSubmission.find({ student: userId })
      .populate('week', 'title weekNumber')
      .sort({ submittedAt: -1 })
      .limit(10);

    // Return user details as JSON or render a partial view
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json({ 
        success: true, 
        user: targetUser,
        progress,
        submissions
      });
    } else {
      // Render a partial view for the modal
      res.render('Admin/partials/user-details', { 
        user: targetUser,
        progress,
        submissions
      });
    }
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while loading user details' 
    });
  }
};

// POST - Update Settings
const updateSettings = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // In a real application, you would save these to a database
    const {
      siteName,
      siteDescription,
      enableRegistration,
      enableNotifications,
      maintenanceMode,
    } = req.body;

    // Mock settings update
    req.flash('success_msg', 'Settings updated successfully');
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Update settings error:', error);
    req.flash('error_msg', 'An error occurred while updating settings');
    res.redirect('/admin/settings');
  }
};

// API Routes for AJAX calls

// GET - API: Get all students
const getStudentsAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const students = await User.find({ role: 'student' })
      .select('name email year studentType')
      .sort({ name: 1 });

    res.json({ success: true, students });
  } catch (error) {
    console.error('Get students API error:', error);
    res.status(500).json({ success: false, message: 'Error loading students' });
  }
};

// GET - API: Get all weeks
const getWeeksAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const weeks = await Week.find({}).sort({ weekNumber: 1 });

    res.json({ success: true, weeks });
  } catch (error) {
    console.error('Get weeks API error:', error);
    res.status(500).json({ success: false, message: 'Error loading weeks' });
  }
};

// GET - API: Get homework submission details
const getHomeworkSubmissionAPI = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submission = await HomeworkSubmission.findById(submissionId)
      .populate('student', 'name email year studentType')
      .populate('week', 'title weekNumber year studentType');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Check if week population failed
    if (!submission.week) {
      return res.status(400).json({ 
        success: false, 
        message: 'Submission references a deleted week. Please contact administrator.' 
      });
    }

    // Transform submission data to match view expectations
    const transformedSubmission = {
      ...submission.toObject(),
      // Map submissionDate to submittedAt for view compatibility
      submittedAt: submission.submissionDate,
      // Map grade.percentage to score for view compatibility
      score: submission.grade && submission.grade.percentage !== undefined ? submission.grade.percentage : null,
      // Map feedback.text to feedback for view compatibility
      feedback: submission.feedback && submission.feedback.text ? submission.feedback.text : null,
      // Ensure status is properly formatted
      status: submission.status || 'submitted',
      // Map files to attachments for view compatibility
      attachments: submission.files ? submission.files.map(file => ({
        name: file.fileName,
        url: file.fileUrl,
        type: file.fileType,
        size: file.fileSize
      })) : [],
      // Map content from description
      content: submission.description || ''
    };

    res.json({ success: true, submission: transformedSubmission });
  } catch (error) {
    console.error('Get homework submission API error:', error);
    res.status(500).json({ success: false, message: 'Error loading submission' });
  }
};

// POST - API: Grade homework submission
const gradeHomeworkSubmissionAPI = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, status, feedback } = req.body;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submission = await HomeworkSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Update grade information
    if (!submission.grade) {
      submission.grade = {};
    }
    submission.grade.points = score;
    submission.grade.maxPoints = 100;
    submission.grade.percentage = score;
    
    // Update status
    submission.status = status;
    
    // Update feedback
    if (!submission.feedback) {
      submission.feedback = {};
    }
    submission.feedback.text = feedback;
    submission.feedback.gradedAt = new Date();
    submission.feedback.gradedBy = user.id;

    await submission.save();

    res.json({ success: true, message: 'Grade saved successfully' });
  } catch (error) {
    console.error('Grade homework submission API error:', error);
    res.status(500).json({ success: false, message: 'Error saving grade' });
  }
};

// DELETE - API: Delete homework submission
const deleteHomeworkSubmissionAPI = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submission = await HomeworkSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    await HomeworkSubmission.findByIdAndDelete(submissionId);

    res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete homework submission API error:', error);
    res.status(500).json({ success: false, message: 'Error deleting submission' });
  }
};

// GET - API: Get student progress details
const getStudentProgressAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId).select('-password');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get student's progress data
    const progress = await StudentProgress.find({ student: studentId })
      .populate('week', 'title weekNumber')
      .sort({ week: 1 });

    res.json({ success: true, student, progress });
  } catch (error) {
    console.error('Get student progress API error:', error);
    res.status(500).json({ success: false, message: 'Error loading student progress' });
  }
};

// PUT - API: Update student progress
const updateStudentProgressAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { currentWeek, totalProgress, reason } = req.body;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    student.currentWeek = currentWeek;
    student.totalProgress = totalProgress;

    await student.save();

    res.json({ success: true, message: 'Student progress updated successfully' });
  } catch (error) {
    console.error('Update student progress API error:', error);
    res.status(500).json({ success: false, message: 'Error updating student progress' });
  }
};

// POST - API: Send reminder to student
const sendStudentReminderAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // In a real app, you would send an email notification here
    console.log(`Sending reminder to student: ${student.email}`);

    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Send student reminder API error:', error);
    res.status(500).json({ success: false, message: 'Error sending reminder' });
  }
};

// PUT - API: Toggle student restriction
const toggleStudentRestrictionAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { feature, enabled } = req.body;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!student.restrictions) {
      student.restrictions = {
        canAccessHomework: true,
        canAccessNotes: true,
        canAccessQuiz: true,
        canAccessWeeks: true,
        canAccessPastPapers: true,
        restrictedWeeks: []
      };
    }

    switch (feature) {
      case 'homework_upload':
        student.restrictions.canAccessHomework = enabled;
        break;
      case 'notes_access':
        student.restrictions.canAccessNotes = enabled;
        break;
      case 'week_access':
        student.restrictions.canAccessWeeks = enabled;
        break;
      case 'quiz_access':
        student.restrictions.canAccessQuiz = enabled;
        break;
      case 'past_papers_access':
        student.restrictions.canAccessPastPapers = enabled;
        break;
    }

    await student.save();

    res.json({ success: true, message: 'Restriction updated successfully' });
  } catch (error) {
    console.error('Toggle student restriction API error:', error);
    res.status(500).json({ success: false, message: 'Error updating restriction' });
  }
};

// GET - API: Get student week restrictions
const getStudentWeekRestrictionsAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId).select('name email year studentType restrictions');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const weeks = await Week.find({}).sort({ weekNumber: 1 });

    res.json({ success: true, student, weeks });
  } catch (error) {
    console.error('Get student week restrictions API error:', error);
    res.status(500).json({ success: false, message: 'Error loading week restrictions' });
  }
};

// PUT - API: Update student week restrictions
const updateStudentWeekRestrictionsAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { restrictedWeeks, reason } = req.body;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!student.restrictions) {
      student.restrictions = {
        canAccessHomework: true,
        canAccessNotes: true,
        canAccessQuiz: true,
        canAccessWeeks: true,
        restrictedWeeks: []
      };
    }

    student.restrictions.restrictedWeeks = restrictedWeeks.map(weekNumber => ({
      weekNumber,
      reason,
      restrictedAt: new Date()
    }));

    await student.save();

    res.json({ success: true, message: 'Week restrictions updated successfully' });
  } catch (error) {
    console.error('Update student week restrictions API error:', error);
    res.status(500).json({ success: false, message: 'Error updating week restrictions' });
  }
};

// DELETE - API: Clear all student restrictions
const clearStudentRestrictionsAPI = async (req, res) => {
  try {
    const { studentId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    student.restrictions = {
      canAccessHomework: true,
      canAccessNotes: true,
      canAccessQuiz: true,
      canAccessWeeks: true,
      restrictedWeeks: []
    };

    await student.save();

    res.json({ success: true, message: 'All restrictions cleared successfully' });
  } catch (error) {
    console.error('Clear student restrictions API error:', error);
    res.status(500).json({ success: false, message: 'Error clearing restrictions' });
  }
};

// GET - API: Get system settings
const getSettingsAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Mock settings - in real app, this would come from database
    const settings = {
      platformName: 'Mr Mohrr7am - IG Math Learning Platform',
      platformDescription: 'Interactive mathematics learning platform for IGCSE, AS, and A2 students.',
      contactEmail: 'admin@mrmohrr7am.com',
      supportPhone: '+1 (555) 123-4567',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      language: 'en',
      maintenanceMode: false,
      academicYearStart: '2024-09-01',
      academicYearEnd: '2025-06-30',
      homeworkDeadline: 7,
      maxFileSize: 10,
      gradingScale: 'percentage',
      passingGrade: 60,
      autoGradeQuizzes: true,
      gradeReleasePolicy: 'immediate',
      emailEnabled: true,
      smtpServer: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUsername: 'noreply@mrmohrr7am.com',
      homeworkReminders: true,
      gradeNotifications: true,
      systemUpdates: true,
      weeklyReports: false,
      notificationFrequency: 'immediate',
      sessionTimeout: 120,
      maxLoginAttempts: 5,
      lockoutDuration: 30,
      requireStrongPasswords: true,
      allowStudentRegistration: false,
      requireEmailVerification: true,
      allowGuestAccess: false,
      ipWhitelist: '',
      autoBackup: true,
      backupFrequency: 'daily',
      backupRetention: 30,
      backupLocation: '/backups',
      logRetention: 90,
      cacheDuration: 24,
      autoOptimize: true,
      autoCleanup: true
    };

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings API error:', error);
    res.status(500).json({ success: false, message: 'Error loading settings' });
  }
};

// PUT - API: Update system settings
const updateSettingsAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const settings = req.body;

    // In a real app, you would save these settings to a database
    console.log('Updating settings:', settings);

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings API error:', error);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
};

// GET - API: Get dashboard statistics
const getStatisticsAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalWeeks = await Week.countDocuments({});
    const pendingHomework = await HomeworkSubmission.countDocuments({ status: 'pending' });
    const completedHomework = await HomeworkSubmission.countDocuments({ status: 'completed' });
    const totalNotes = await Note.countDocuments({});
    const totalPastPapers = await PastPaper.countDocuments({});
    const pendingUsers = await User.countDocuments({ 
      role: 'student', 
      isActive: false 
    });

    const statistics = {
      totalStudents,
      totalWeeks,
      pendingHomework,
      completedHomework,
      totalNotes,
      totalPastPapers,
      pendingUsers,
      activeStudents: await User.countDocuments({ 
        role: 'student', 
        lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    };

    res.json({ success: true, statistics });
  } catch (error) {
    console.error('Get statistics API error:', error);
    res.status(500).json({ success: false, message: 'Error loading statistics' });
  }
};

// GET - API: Get recent activity
const getRecentActivityAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get recent students
    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt');

    // Get recent homework submissions
    const recentHomework = await HomeworkSubmission.find({})
      .populate('student', 'name')
      .populate('week', 'title')
      .sort({ submittedAt: -1 })
      .limit(5);

    // Get recent notes
    const recentNotes = await Note.find({})
      .populate('week', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = [
      ...recentStudents.map(student => ({
        type: 'user_registered',
        message: `${student.name} registered`,
        timestamp: student.createdAt,
        icon: 'fas fa-user-plus'
      })),
      ...recentHomework.filter(homework => homework.student && homework.week).map(homework => ({
        type: 'homework_submitted',
        message: `${homework.student?.name || 'Student'} submitted homework for ${homework.week?.title || 'Week'}`,
        timestamp: homework.submittedAt,
        icon: 'fas fa-file-alt'
      })),
      ...recentNotes.map(note => ({
        type: 'note_created',
        message: `New note created: ${note.title}`,
        timestamp: note.createdAt,
        icon: 'fas fa-sticky-note'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    res.json({ success: true, recentActivity });
  } catch (error) {
    console.error('Get recent activity API error:', error);
    res.status(500).json({ success: false, message: 'Error loading recent activity' });
  }
};

// GET - API: Get badge counts
const getBadgesAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const badges = {
      pendingUsers: await User.countDocuments({ role: 'student', isActive: false }),
      pendingHomework: await HomeworkSubmission.countDocuments({ status: 'pending' }),
      inactiveWeeks: await Week.countDocuments({ isActive: false }),
      totalStudents: await User.countDocuments({ role: 'student' }),
      totalWeeks: await Week.countDocuments({}),
      totalNotes: await Note.countDocuments({}),
      totalPastPapers: await PastPaper.countDocuments({})
    };

    res.json({ success: true, badges });
  } catch (error) {
    console.error('Get badges API error:', error);
    res.status(500).json({ success: false, message: 'Error loading badges' });
  }
};

// GET - Past Papers Management
const getPastPapers = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const pastPapers = await PastPaper.find({}).sort({ examYear: -1, paperType: 1 });

    res.render('Admin/past-papers', {
      title: 'Past Papers Management',
      user,
      pastPapers,
      page: 'past-papers',
      layout: false,
    });
  } catch (error) {
    console.error('Past papers error:', error);
    req.flash('error_msg', 'An error occurred while loading past papers');
    res.redirect('/admin/dashboard');
  }
};

// GET - Year Content Management
const getYearContent = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/auth/login');
    }

    const yearContent = await YearContent.find({}).sort({ year: 1 });

    res.render('Admin/year-content', {
      title: 'Year Content Management',
      user,
      yearContent,
      page: 'year-content',
      layout: false,
    });
  } catch (error) {
    console.error('Year content error:', error);
    req.flash('error_msg', 'An error occurred while loading year content');
    res.redirect('/admin/dashboard');
  }
};

// POST - Create Past Paper
const createPastPaper = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      title,
      description,
      year,
      curriculum,
      studentType,
      paperType,
      examYear,
      duration,
      totalMarks,
      calculatorAllowed,
      difficulty,
      topics,
      allowPreview,
      previewPages,
      accessLevel
    } = req.body;

    // Handle main paper file upload
    let fileUploadResult = null;
    let finalFileUrl = '';
    let finalFileName = '';
    let finalFileType = '';
    let finalFileSize = 0;
    let finalCloudinaryPublicId = '';

    if (req.file) {
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      fileUploadResult = await uploadToCloudinary(
        fileBase64, 
        `mr-mohrr7am/past-papers/${year}/${paperType}`,
        req.file.mimetype
      );
      
      if (fileUploadResult.success) {
        finalFileUrl = fileUploadResult.url;
        finalFileName = req.file.originalname;
        finalFileType = req.file.mimetype;
        finalFileSize = fileUploadResult.size;
        finalCloudinaryPublicId = fileUploadResult.publicId;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'File upload failed: ' + fileUploadResult.error 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Main paper file is required' 
      });
    }

    const newPastPaper = new PastPaper({
      title,
      description,
      year,
      curriculum,
      studentType,
      paperType,
      examYear: parseInt(examYear),
      duration: parseInt(duration),
      totalMarks: parseInt(totalMarks),
      calculatorAllowed: calculatorAllowed === 'true',
      difficulty,
      topics: topics ? topics.split(',').map(t => t.trim()) : [],
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileType: finalFileType,
      fileSize: finalFileSize,
      cloudinaryPublicId: finalCloudinaryPublicId,
      allowPreview: allowPreview === 'true',
      previewPages: parseInt(previewPages) || 3,
      accessControl: {
        isPublic: accessLevel === 'public',
        accessLevel: accessLevel || 'public',
        restrictedStudents: [],
        allowedStudents: []
      },
      createdBy: user.id
    });

    await newPastPaper.save();
    
    res.json({ 
      success: true, 
      message: 'Past paper created successfully',
      pastPaper: newPastPaper
    });
  } catch (error) {
    console.error('Create past paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while creating the past paper' 
    });
  }
};

// POST - Create Year Content
const createYearContent = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      year,
      title,
      description,
      icon,
      features,
      curriculum,
      studentType,
      learningObjectives,
      topics,
      prerequisites,
      assessmentTypes,
      resources
    } = req.body;

    const newYearContent = new YearContent({
      year,
      title,
      description,
      icon,
      features: features ? features.split(',').map(f => f.trim()) : [],
      curriculum,
      studentType,
      learningObjectives: learningObjectives || [],
      topics: topics || [],
      prerequisites: prerequisites ? prerequisites.split(',').map(p => p.trim()) : [],
      assessmentTypes: assessmentTypes || [],
      resources: resources || [],
      createdBy: user.id
    });

    await newYearContent.save();
    
    res.json({ 
      success: true, 
      message: 'Year content created successfully',
      yearContent: newYearContent
    });
  } catch (error) {
    console.error('Create year content error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while creating the year content' 
    });
  }
};

// POST - Create Note
const createNote = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      title,
      description,
      week,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      previewUrl,
      allowDownload,
      tags
    } = req.body;

    const newNote = new Note({
      title,
      description,
      week,
      fileName,
      fileType,
      fileSize: parseInt(fileSize),
      fileUrl,
      previewUrl,
      allowDownload: allowDownload === 'true',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      createdBy: user.id
    });

    await newNote.save();
    
    res.json({ 
      success: true, 
      message: 'Note created successfully',
      note: newNote
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while creating the note' 
    });
  }
};

// GET - Week Content Management
const getWeekContent = async (req, res) => {
  try {
    const { weekId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const week = await Week.findById(weekId);
    if (!week) {
      return res.status(404).json({ success: false, message: 'Week not found' });
    }

    // Get content from WeekContent model
    const weekContent = await WeekContent.find({ week: weekId, isActive: true })
      .sort({ order: 1, createdAt: 1 });

    // Convert Week materials to WeekContent format for display
    // Only include materials that don't already exist in WeekContent
    const weekMaterials = (week.materials || []).map((material, index) => ({
      _id: `week-material-${material._id || index}`, // Ensure consistent ID format
      title: material.title,
      description: material.description,
      type: material.type,
      content: material.content || '',
      fileUrl: material.fileUrl || '',
      fileName: material.fileName || '',
      fileType: material.fileType || '',
      fileSize: material.fileSize || 0,
      isSecure: material.isSecure || false,
      allowDownload: material.allowDownload !== false,
      previewUrl: material.previewUrl || '',
      cloudinaryPublicId: material.cloudinaryPublicId || '',
      isRequired: material.isRequired !== false,
      dueDate: material.dueDate || null,
      maxScore: material.maxScore || 100,
      estimatedTime: material.estimatedTime || 30,
      order: material.order || index,
      createdAt: material.createdAt || week.createdAt,
      updatedAt: material.updatedAt || week.updatedAt,
      createdBy: material.createdBy || week.createdBy,
      isActive: true,
      week: weekId,
      isWeekMaterial: true, // Flag to identify week materials
      originalMaterialId: material._id // Store the original material ID for deletion
    }));

    // Filter out week materials that already exist in WeekContent to avoid duplication
    const filteredWeekMaterials = weekMaterials.filter(weekMaterial => {
      // Check if a WeekContent item with the same title and type already exists
      return !weekContent.some(wc => 
        wc.title === weekMaterial.title && 
        wc.type === weekMaterial.type &&
        (wc.fileName === weekMaterial.fileName || 
         (!wc.fileName && !weekMaterial.fileName))
      );
    });

    // Combine both sources of content, prioritizing WeekContent
    const allContent = [...weekContent, ...filteredWeekMaterials];

    res.json({ success: true, week, weekContent: allContent });
  } catch (error) {
    console.error('Get week content error:', error);
    res.status(500).json({ success: false, message: 'Error loading week content' });
  }
};

// POST - Add Week Content
const addWeekContent = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      weekId,
      title,
      description,
      type,
      content,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      isSecure,
      allowDownload,
      previewUrl,
      cloudinaryPublicId,
      isRequired,
      dueDate,
      dueDateOnly,
      dueTime,
      timezone,
      allowLateSubmission,
      latePenalty,
      maxScore,
      estimatedTime,
      order
    } = req.body;
    
    console.log('Add Week Content - Type:', type, 'Has file:', !!req.file, 'File name:', req.file?.originalname);

    let fileUploadResult = null;
    let finalFileUrl = fileUrl;
    let finalFileName = fileName;
    let finalFileType = fileType;
    let finalFileSize = fileSize;
    let finalCloudinaryPublicId = cloudinaryPublicId;

    // Handle file upload if file is provided
    if (req.file && (type === 'homework' || type === 'pdf' || type === 'el-5olasa')) {
      // Convert buffer to base64 for Cloudinary
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      fileUploadResult = await uploadToCloudinary(
        fileBase64, 
        `mr-mohrr7am/week-content/${weekId}`,
        req.file.mimetype
      );
      
      if (fileUploadResult.success) {
        finalFileUrl = fileUploadResult.url;
        finalFileName = req.file.originalname;
        finalFileType = req.file.mimetype;
        finalFileSize = fileUploadResult.size;
        finalCloudinaryPublicId = fileUploadResult.publicId;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'File upload failed: ' + fileUploadResult.error 
        });
      }
    }

    // Create dueDateTime for homework assignments
    let dueDateTime = null;
    if (type === 'homework' && dueDateOnly && dueTime) {
      // Combine date and time, then convert to UTC
      const localDateTime = new Date(`${dueDateOnly}T${dueTime}`);
      dueDateTime = localDateTime;
    }

    const newContent = new WeekContent({
      week: weekId,
      title,
      description,
      type,
      content,
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileType: finalFileType,
      fileSize: parseInt(finalFileSize) || 0,
      isSecure: isSecure === 'true',
      allowDownload: allowDownload !== 'false',
      previewUrl,
      cloudinaryPublicId: finalCloudinaryPublicId,
      isRequired: isRequired !== 'false',
      dueDate: dueDate ? new Date(dueDate) : null,
      dueDateTime: dueDateTime,
      dueDateOnly: dueDateOnly ? new Date(dueDateOnly) : null,
      dueTime: dueTime || null,
      timezone: timezone || 'UTC',
      allowLateSubmission: allowLateSubmission === 'true',
      latePenalty: parseInt(latePenalty) || 0,
      maxScore: parseInt(maxScore) || 100,
      estimatedTime: parseInt(estimatedTime) || 30,
      order: parseInt(order) || 0,
      createdBy: user.id
    });

    await newContent.save();

    // Update week materials array
    const week = await Week.findById(weekId);
    if (week) {
      week.materials.push({
        type,
        title,
        description,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        fileType: finalFileType,
        fileSize: parseInt(finalFileSize) || 0,
        isSecure: isSecure === 'true',
        allowDownload: allowDownload !== 'false',
        previewUrl,
        isRequired: isRequired !== 'false',
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: parseInt(maxScore) || 100,
        estimatedTime: parseInt(estimatedTime) || 30
      });
      await week.save();
    }

    res.json({ 
      success: true, 
      message: 'Content added successfully',
      content: newContent
    });
  } catch (error) {
    console.error('Add week content error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while adding content' 
    });
  }
};

// PUT - Update Week Content
const updateWeekContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      title,
      description,
      type,
      content,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      isSecure,
      allowDownload,
      previewUrl,
      cloudinaryPublicId,
      isRequired,
      dueDate,
      maxScore,
      estimatedTime,
      order
    } = req.body;

    let fileUploadResult = null;
    let finalFileUrl = fileUrl;
    let finalFileName = fileName;
    let finalFileType = fileType;
    let finalFileSize = fileSize;
    let finalCloudinaryPublicId = cloudinaryPublicId;

    // Handle file upload if file is provided
    if (req.file && (type === 'homework' || type === 'pdf' || type === 'el-5olasa')) {
      // Convert buffer to base64 for Cloudinary
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      fileUploadResult = await uploadToCloudinary(
        fileBase64, 
        `mr-mohrr7am/week-content/${req.body.weekId}`,
        req.file.mimetype
      );
      
      if (fileUploadResult.success) {
        finalFileUrl = fileUploadResult.url;
        finalFileName = req.file.originalname;
        finalFileType = req.file.mimetype;
        finalFileSize = fileUploadResult.size;
        finalCloudinaryPublicId = fileUploadResult.publicId;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'File upload failed: ' + fileUploadResult.error 
        });
      }
    }

    const updateData = {
      title,
      description,
      type,
      content,
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileType: finalFileType,
      fileSize: parseInt(finalFileSize) || 0,
      isSecure: isSecure === 'true',
      allowDownload: allowDownload !== 'false',
      previewUrl,
      cloudinaryPublicId: finalCloudinaryPublicId,
      isRequired: isRequired !== 'false',
      dueDate: dueDate ? new Date(dueDate) : null,
      maxScore: parseInt(maxScore) || 100,
      estimatedTime: parseInt(estimatedTime) || 30,
      order: parseInt(order) || 0,
      updatedAt: new Date()
    };

    const updatedContent = await WeekContent.findByIdAndUpdate(
      contentId,
      updateData,
      { new: true }
    );

    if (!updatedContent) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    res.json({ 
      success: true, 
      message: 'Content updated successfully',
      content: updatedContent
    });
  } catch (error) {
    console.error('Update week content error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating content' 
    });
  }
};

// DELETE - Remove Week Content
const deleteWeekContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const user = req.session.user;
    
    console.log('Delete request - Content ID:', contentId);
    console.log('Delete request - Query params:', req.query);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if it's a week material (starts with 'week-material-')
    if (contentId.startsWith('week-material-')) {
      // Extract the week ID and material ID
      const weekId = req.query.weekId;
      console.log('Week material delete - Week ID:', weekId);
      
      if (!weekId) {
        return res.status(400).json({ success: false, message: 'Week ID is required for week materials' });
      }

      const week = await Week.findById(weekId);
      if (!week) {
        return res.status(404).json({ success: false, message: 'Week not found' });
      }

      // Extract the original material ID from contentId
      const originalMaterialId = contentId.replace('week-material-', '');
      console.log('Original material ID:', originalMaterialId);
      console.log('Week materials:', week.materials.map(m => ({ id: m._id, title: m.title })));
      
      // Find the material by its original ID
      const materialIndex = week.materials.findIndex(material => 
        material._id && material._id.toString() === originalMaterialId
      );
      
      console.log('Material index found:', materialIndex);
      
      if (materialIndex >= 0) {
        // Remove the material from the week's materials array
        const deletedMaterial = week.materials[materialIndex];
        week.materials.splice(materialIndex, 1);
        await week.save();
        
        // Also check if there's a corresponding WeekContent that should be deleted
        const duplicateWeekContent = await WeekContent.findOne({
          week: weekId,
          title: deletedMaterial.title,
          type: deletedMaterial.type
        });
        
        if (duplicateWeekContent) {
          console.log('Found duplicate WeekContent, removing it too');
          await WeekContent.findByIdAndDelete(duplicateWeekContent._id);
        }
        
        console.log('Material deleted successfully:', deletedMaterial.title);
        return res.json({ success: true, message: 'Week material deleted successfully' });
      } else {
        console.log('Material not found in week materials');
        return res.status(404).json({ success: false, message: 'Material not found' });
      }
    } else {
      // Handle WeekContent deletion
      console.log('Deleting WeekContent with ID:', contentId);
      
      // First check if the content exists
      const existingContent = await WeekContent.findById(contentId);
      console.log('Existing content found:', existingContent ? existingContent.title : 'Not found');
      
      if (!existingContent) {
        console.log('Content not found in WeekContent collection');
        
        // Check if it might be a week material that was incorrectly identified
        const weekId = req.query.weekId;
        if (weekId) {
          console.log('Checking if content exists in week materials...');
          const week = await Week.findById(weekId);
          if (week && week.materials) {
            const weekMaterial = week.materials.find(material => 
              material._id && material._id.toString() === contentId
            );
            if (weekMaterial) {
              console.log('Found content in week materials, treating as week material');
              // Treat as week material deletion
              const materialIndex = week.materials.findIndex(material => 
                material._id && material._id.toString() === contentId
              );
              if (materialIndex >= 0) {
                const deletedMaterial = week.materials[materialIndex];
                week.materials.splice(materialIndex, 1);
                await week.save();
                
                // Also check if there's a corresponding WeekContent that should be deleted
                const duplicateWeekContent = await WeekContent.findOne({
                  week: weekId,
                  title: deletedMaterial.title,
                  type: deletedMaterial.type
                });
                
                if (duplicateWeekContent) {
                  console.log('Found duplicate WeekContent in fallback, removing it too');
                  await WeekContent.findByIdAndDelete(duplicateWeekContent._id);
                }
                
                return res.json({ success: true, message: 'Week material deleted successfully' });
              }
            }
          }
        }
        
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      
      // First, check if there's a corresponding Week.material that should also be deleted
      const weekId = req.query.weekId;
      if (weekId) {
        const week = await Week.findById(weekId);
        if (week && week.materials) {
          // Look for a material with the same title and type (potential duplicate)
          const duplicateMaterialIndex = week.materials.findIndex(material => 
            material.title === existingContent.title && 
            material.type === existingContent.type
          );
          
          if (duplicateMaterialIndex >= 0) {
            console.log('Found duplicate material in Week.materials, removing it too');
            week.materials.splice(duplicateMaterialIndex, 1);
            await week.save();
          }
        }
      }
      
      // Now delete the WeekContent (hard delete)
      const deletedContent = await WeekContent.findByIdAndDelete(contentId);

      if (!deletedContent) {
        console.log('Failed to delete content');
        return res.status(404).json({ success: false, message: 'Content not found' });
      }

      console.log('WeekContent deleted successfully:', deletedContent.title);
      
      // Clean up any orphaned content
      if (weekId) {
        await cleanupOrphanedContent(weekId);
      }
      
      res.json({ 
        success: true, 
        message: 'Content removed successfully'
      });
    }
  } catch (error) {
    console.error('Delete week content error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while removing content' 
    });
  }
};

// PUT - Update Week Material
const updateWeekMaterial = async (req, res) => {
  try {
    const { weekId, materialId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      title,
      description,
      type,
      content,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      isSecure,
      allowDownload,
      previewUrl,
      cloudinaryPublicId,
      isRequired,
      dueDate,
      maxScore,
      estimatedTime,
      order
    } = req.body;

    const week = await Week.findById(weekId);
    if (!week) {
      return res.status(404).json({ success: false, message: 'Week not found' });
    }

    // Extract the original material ID from materialId
    const originalMaterialId = materialId.replace('week-material-', '');
    
    // Find the material by its original ID
    const materialIndex = week.materials.findIndex(material => 
      material._id && material._id.toString() === originalMaterialId
    );
    
    if (materialIndex < 0) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    let fileUploadResult = null;
    let finalFileUrl = fileUrl;
    let finalFileName = fileName;
    let finalFileType = fileType;
    let finalFileSize = fileSize;
    let finalCloudinaryPublicId = cloudinaryPublicId;

    // Handle file upload if file is provided
    if (req.file && (type === 'homework' || type === 'pdf' || type === 'el-5olasa')) {
      // Convert buffer to base64 for Cloudinary
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      fileUploadResult = await uploadToCloudinary(
        fileBase64, 
        `mr-mohrr7am/week-content/${weekId}`,
        req.file.mimetype
      );
      
      if (fileUploadResult.success) {
        finalFileUrl = fileUploadResult.url;
        finalFileName = req.file.originalname;
        finalFileType = req.file.mimetype;
        finalFileSize = fileUploadResult.size;
        finalCloudinaryPublicId = fileUploadResult.publicId;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'File upload failed: ' + fileUploadResult.error 
        });
      }
    }

    // Update the material in the week's materials array
    week.materials[materialIndex] = {
      ...week.materials[materialIndex],
      title,
      description,
      type,
      content,
      fileUrl: finalFileUrl,
      fileName: finalFileName,
      fileType: finalFileType,
      fileSize: parseInt(finalFileSize) || 0,
      isSecure: isSecure === 'true',
      allowDownload: allowDownload !== 'false',
      previewUrl,
      cloudinaryPublicId: finalCloudinaryPublicId,
      isRequired: isRequired !== 'false',
      dueDate: dueDate ? new Date(dueDate) : null,
      maxScore: parseInt(maxScore) || 100,
      estimatedTime: parseInt(estimatedTime) || materialIndex,
      order: parseInt(order) || materialIndex,
      updatedAt: new Date()
    };

    await week.save();

    res.json({ 
      success: true, 
      message: 'Week material updated successfully',
      material: week.materials[materialIndex]
    });
  } catch (error) {
    console.error('Update week material error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating material' 
    });
  }
};

// Utility function to clean up orphaned content
const cleanupOrphanedContent = async (weekId) => {
  try {
    console.log('Cleaning up orphaned content for week:', weekId);
    
    // Find WeekContent entries for this week
    const weekContentEntries = await WeekContent.find({ week: weekId });
    
    // Find the corresponding week
    const week = await Week.findById(weekId);
    
    if (!week) {
      console.log('Week not found, deleting all WeekContent entries');
      await WeekContent.deleteMany({ week: weekId });
      return;
    }
    
    // Check for duplicates between WeekContent and Week.materials
    const weekMaterials = week.materials || [];
    
    for (const weekContent of weekContentEntries) {
      // Look for duplicate material in Week.materials
      const duplicateMaterial = weekMaterials.find(material => 
        material.title === weekContent.title && 
        material.type === weekContent.type
      );
      
      if (duplicateMaterial) {
        console.log('Found duplicate content:', weekContent.title);
        // Remove the duplicate from Week.materials since WeekContent takes precedence
        const materialIndex = week.materials.findIndex(m => 
          m._id && m._id.toString() === duplicateMaterial._id.toString()
        );
        
        if (materialIndex >= 0) {
          week.materials.splice(materialIndex, 1);
          await week.save();
          console.log('Removed duplicate from Week.materials');
        }
      }
    }
    
    console.log('Orphaned content cleanup completed');
  } catch (error) {
    console.error('Error cleaning up orphaned content:', error);
  }
};

// GET - API: Get orphaned homework submissions
const getOrphanedHomeworkAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Find all homework submissions
    const allSubmissions = await HomeworkSubmission.find({})
      .populate('student', 'name email')
      .populate('week', 'title weekNumber');

    // Filter out submissions where week population failed
    const orphanedSubmissions = allSubmissions.filter(submission => submission.week === null);

    res.json({ 
      success: true, 
      orphanedSubmissions,
      count: orphanedSubmissions.length 
    });
  } catch (error) {
    console.error('Get orphaned homework API error:', error);
    res.status(500).json({ success: false, message: 'Error loading orphaned submissions' });
  }
};

// DELETE - API: Clean up orphaned homework submissions
const cleanupOrphanedHomeworkAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Find all homework submissions
    const allSubmissions = await HomeworkSubmission.find({})
      .populate('week');

    // Get IDs of submissions with missing weeks
    const orphanedIds = allSubmissions
      .filter(submission => submission.week === null)
      .map(submission => submission._id);

    if (orphanedIds.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No orphaned submissions found',
        deletedCount: 0 
      });
    }

    // Delete orphaned submissions
    const result = await HomeworkSubmission.deleteMany({ _id: { $in: orphanedIds } });

    res.json({ 
      success: true, 
      message: `Successfully cleaned up ${result.deletedCount} orphaned homework submissions`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Cleanup orphaned homework API error:', error);
    res.status(500).json({ success: false, message: 'Error cleaning up orphaned submissions' });
  }
};

// PUT - Update Past Paper
const updatePastPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const {
      title,
      description,
      year,
      curriculum,
      studentType,
      paperType,
      examYear,
      duration,
      totalMarks,
      calculatorAllowed,
      difficulty,
      topics,
      allowPreview,
      previewPages,
      accessLevel
    } = req.body;

    const pastPaper = await PastPaper.findById(paperId);
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    // Handle file upload if new file is provided
    let fileUploadResult = null;
    let finalFileUrl = pastPaper.fileUrl;
    let finalFileName = pastPaper.fileName;
    let finalFileType = pastPaper.fileType;
    let finalFileSize = pastPaper.fileSize;
    let finalCloudinaryPublicId = pastPaper.cloudinaryPublicId;

    if (req.file) {
      const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      fileUploadResult = await uploadToCloudinary(
        fileBase64, 
        `mr-mohrr7am/past-papers/${year}/${paperType}`,
        req.file.mimetype
      );
      
      if (fileUploadResult.success) {
        finalFileUrl = fileUploadResult.url;
        finalFileName = req.file.originalname;
        finalFileType = req.file.mimetype;
        finalFileSize = fileUploadResult.size;
        finalCloudinaryPublicId = fileUploadResult.publicId;
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'File upload failed: ' + fileUploadResult.error 
        });
      }
    }

    // Update past paper
    pastPaper.title = title;
    pastPaper.description = description;
    pastPaper.year = year;
    pastPaper.curriculum = curriculum;
    pastPaper.studentType = studentType;
    pastPaper.paperType = paperType;
    pastPaper.examYear = parseInt(examYear);
    pastPaper.duration = parseInt(duration);
    pastPaper.totalMarks = parseInt(totalMarks);
    pastPaper.calculatorAllowed = calculatorAllowed === 'true';
    pastPaper.difficulty = difficulty;
    pastPaper.topics = topics ? topics.split(',').map(t => t.trim()) : [];
    pastPaper.fileUrl = finalFileUrl;
    pastPaper.fileName = finalFileName;
    pastPaper.fileType = finalFileType;
    pastPaper.fileSize = finalFileSize;
    pastPaper.cloudinaryPublicId = finalCloudinaryPublicId;
    pastPaper.allowPreview = allowPreview === 'true';
    pastPaper.previewPages = parseInt(previewPages) || 3;
    pastPaper.accessControl.accessLevel = accessLevel || 'public';
    pastPaper.accessControl.isPublic = accessLevel === 'public';
    pastPaper.updatedAt = new Date();

    await pastPaper.save();
    
    res.json({ 
      success: true, 
      message: 'Past paper updated successfully',
      pastPaper: pastPaper
    });
  } catch (error) {
    console.error('Update past paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating the past paper' 
    });
  }
};

// DELETE - Delete Past Paper
const deletePastPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPaper = await PastPaper.findById(paperId);
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    await PastPaper.findByIdAndDelete(paperId);
    
    res.json({ 
      success: true, 
      message: 'Past paper deleted successfully'
    });
  } catch (error) {
    console.error('Delete past paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while deleting the past paper' 
    });
  }
};

// GET - Past Paper Details
const getPastPaperDetails = async (req, res) => {
  try {
    const { paperId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPaper = await PastPaper.findById(paperId).populate('createdBy', 'name');
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    res.json({ success: true, pastPaper });
  } catch (error) {
    console.error('Get past paper details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while loading past paper details' 
    });
  }
};

// GET - Download Past Paper (Admin)
const downloadPastPaperAdmin = async (req, res) => {
  try {
    const { paperId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const paper = await PastPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    // Stream the PDF directly to the client with proper headers
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse(paper.fileUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDFDownloader/1.0)'
      }
    };

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${paper.fileName || paper.title}.pdf"`);
    
    const proxyReq = https.request(options, (proxyRes) => {
      // Forward content length if available
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      
      // Pipe the PDF data directly to the response
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Error fetching PDF:', error);
      res.status(500).json({ success: false, message: 'Error downloading PDF' });
    });

    proxyReq.end();
  } catch (error) {
    console.error('Download past paper error:', error);
    res.status(500).json({ success: false, message: 'Error downloading past paper' });
  }
};

// PUT - Toggle Past Paper Status
const togglePastPaperStatus = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { action } = req.body;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPaper = await PastPaper.findById(paperId);
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    if (action === 'activate') {
      pastPaper.isActive = true;
    } else if (action === 'deactivate') {
      pastPaper.isActive = false;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await pastPaper.save();
    
    res.json({ 
      success: true, 
      message: `Past paper ${action}d successfully`
    });
  } catch (error) {
    console.error('Toggle past paper status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating past paper status' 
    });
  }
};

// PUT - Update Past Paper Access Control
const updatePastPaperAccess = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { accessLevel, restrictedStudents, allowedStudents } = req.body;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPaper = await PastPaper.findById(paperId);
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    pastPaper.accessControl.accessLevel = accessLevel;
    pastPaper.accessControl.isPublic = accessLevel === 'public';
    pastPaper.accessControl.restrictedStudents = restrictedStudents || [];
    pastPaper.accessControl.allowedStudents = allowedStudents || [];
    pastPaper.updatedAt = new Date();

    await pastPaper.save();
    
    res.json({ 
      success: true, 
      message: 'Past paper access control updated successfully'
    });
  } catch (error) {
    console.error('Update past paper access error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while updating past paper access' 
    });
  }
};

// POST - Add Answer Key
const addAnswerKey = async (req, res) => {
  try {
    const { paperId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPaper = await PastPaper.findById(paperId);
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Answer key file is required' });
    }

    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    const fileUploadResult = await uploadToCloudinary(
      fileBase64, 
      `mr-mohrr7am/past-papers/answer-keys/${paperId}`,
      req.file.mimetype
    );
    
    if (fileUploadResult.success) {
      pastPaper.answerKeyUrl = fileUploadResult.url;
      pastPaper.answerKeyFileName = req.file.originalname;
      pastPaper.answerKeyFileType = req.file.mimetype;
      pastPaper.answerKeyFileSize = fileUploadResult.size;
      pastPaper.answerKeyCloudinaryPublicId = fileUploadResult.publicId;
      pastPaper.updatedAt = new Date();

      await pastPaper.save();
      
      res.json({ 
        success: true, 
        message: 'Answer key added successfully'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Answer key upload failed: ' + fileUploadResult.error 
      });
    }
  } catch (error) {
    console.error('Add answer key error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while adding answer key' 
    });
  }
};

// POST - Add Marking Scheme
const addMarkingScheme = async (req, res) => {
  try {
    const { paperId } = req.params;
    const user = req.session.user;
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPaper = await PastPaper.findById(paperId);
    if (!pastPaper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Marking scheme file is required' });
    }

    const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    const fileUploadResult = await uploadToCloudinary(
      fileBase64, 
      `mr-mohrr7am/past-papers/marking-schemes/${paperId}`,
      req.file.mimetype
    );
    
    if (fileUploadResult.success) {
      pastPaper.markingSchemeUrl = fileUploadResult.url;
      pastPaper.markingSchemeFileName = req.file.originalname;
      pastPaper.markingSchemeFileType = req.file.mimetype;
      pastPaper.markingSchemeFileSize = fileUploadResult.size;
      pastPaper.markingSchemeCloudinaryPublicId = fileUploadResult.publicId;
      pastPaper.updatedAt = new Date();

      await pastPaper.save();
      
      res.json({ 
        success: true, 
        message: 'Marking scheme added successfully'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Marking scheme upload failed: ' + fileUploadResult.error 
      });
    }
  } catch (error) {
    console.error('Add marking scheme error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while adding marking scheme' 
    });
  }
};

// GET - API: Get all past papers
const getPastPapersAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pastPapers = await PastPaper.find({})
      .populate('createdBy', 'name')
      .sort({ examYear: -1, paperType: 1 });

    res.json({ success: true, pastPapers });
  } catch (error) {
    console.error('Get past papers API error:', error);
    res.status(500).json({ success: false, message: 'Error loading past papers' });
  }
};

// Send WhatsApp notification for homework submission
const sendHomeworkNotificationAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { submissionId } = req.params;
    if (!submissionId) {
      return res.status(400).json({ success: false, message: 'Submission ID is required' });
    }

    // Check if submission exists
    const submission = await HomeworkSubmission.findById(submissionId)
      .populate('student', 'name parentPhoneNumber year schoolName')
      .populate('week', 'title weekNumber');
      
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Homework submission not found' });
    }

    // Send notification
    const notificationService = require('../utils/notificationService');
    const result = await notificationService.sendHomeworkSubmissionNotification(submissionId);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send notification',
        error: result.error 
      });
    }

    return res.json({
      success: true,
      message: 'Notification sent successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Send homework notification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error sending notification',
      error: error.message 
    });
  }
};

// POST - API: Send admin missed-homework summary now
const sendMissedHomeworkSummaryAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const notificationService = require('../utils/notificationService');
    const whatsappService = require('../utils/whatsappService');

    // Reuse scheduled logic: find overdue homeworks
    const now = new Date();
    const WeekContent = require('../models/WeekContent');
    const overdueHomework = await WeekContent.find({
      type: 'homework',
      dueDateTime: { $lt: now }
    }).populate('week', 'title weekNumber year studentType');

    const items = [];
    for (const hw of overdueHomework) {
      const missing = await notificationService.getStudentsWhoHaventSubmitted(hw.week._id, hw._id);
      if (missing.success) {
        items.push({
          week: hw.week,
          homework: { _id: hw._id, title: hw.title },
          year: hw.week.year,
          studentType: hw.week.studentType,
          students: missing.students.map(s => ({ name: s.name }))
        });
      }
    }

    if (items.length === 0) {
      return res.json({ success: true, message: 'No missed homework to report' });
    }

    const adminPhone = process.env.ADMIN_PHONE || '01156012078';
    const result = await whatsappService.sendAdminMissedHomeworkSummary({ adminPhone, items });

    return res.json({ success: result.success, message: result.message || 'Summary sent', data: result.data });
  } catch (error) {
    console.error('Send missed homework summary error:', error);
    return res.status(500).json({ success: false, message: 'Error sending summary', error: error.message });
  }
};

// Send custom WhatsApp message to a student or parent
const sendCustomMessageAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { studentId } = req.params;
    const { message, sendToParent = true, adminPhone } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // Find the student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Determine which phone number to use
    const phoneNumber = sendToParent ? student.parentPhoneNumber : student.studentPhoneNumber;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: `${sendToParent ? 'Parent' : 'Student'} phone number not found` 
      });
    }

    // Send the message
    const whatsappService = require('../utils/whatsappService');
    const result = await whatsappService.sendWhatsAppMessage(message, phoneNumber, {
      adminPhone: adminPhone || '01200077825'
    });

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send message',
        error: result.error 
      });
    }

    return res.json({
      success: true,
      message: 'Message sent successfully',
      data: result.data,
      sentTo: {
        name: student.name,
        recipient: sendToParent ? 'parent' : 'student',
        phone: phoneNumber
      }
    });
  } catch (error) {
    console.error('Send custom message error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error sending message',
      error: error.message 
    });
  }
};

// Send due date reminders for homework
const sendDueDateRemindersAPI = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { weekId, homeworkId } = req.params;
    if (!weekId || !homeworkId) {
      return res.status(400).json({ success: false, message: 'Week ID and Homework ID are required' });
    }

    // Send reminders
    const notificationService = require('../utils/notificationService');
    const result = await notificationService.sendDueDateReminders(weekId, homeworkId);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send reminders',
        error: result.error 
      });
    }

    return res.json({
      success: true,
      message: `Reminders sent to ${result.results.filter(r => r.success).length} students`,
      data: result
    });
  } catch (error) {
    console.error('Send due date reminders error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error sending reminders',
      error: error.message 
    });
  }
};

module.exports = {
  getAdminDashboard,
  getManageUsers,
  getManageWeeks,
  getWeekContent,
  addWeekContent,
  updateWeekContent,
  deleteWeekContent,
  updateWeekMaterial,
  getHomework,
  getNotes,
  getProgress,
  getRestrictions,
  getSettings,
  getPastPapers,
  getYearContent,
  toggleUserStatus,
  createWeek,
  updateWeek,
  toggleWeekStatus,
  getWeekDetails,
  deleteWeek,
  createUser,
  getUserDetails,
  updateSettings,
  createPastPaper,
  createYearContent,
  createNote,
  // API Routes
  getStudentsAPI,
  getWeeksAPI,
  getHomeworkSubmissionAPI,
  gradeHomeworkSubmissionAPI,
  deleteHomeworkSubmissionAPI,
  getStudentProgressAPI,
  updateStudentProgressAPI,
  sendStudentReminderAPI,
  toggleStudentRestrictionAPI,
  getStudentWeekRestrictionsAPI,
  updateStudentWeekRestrictionsAPI,
  clearStudentRestrictionsAPI,
  getSettingsAPI,
  updateSettingsAPI,
  getStatisticsAPI,
  getRecentActivityAPI,
  getBadgesAPI,
  getOrphanedHomeworkAPI,
  cleanupOrphanedHomeworkAPI,
  getWeekContent,
  addWeekContent,
  updateWeekContent,
  deleteWeekContent,
  // Past Paper Management
  updatePastPaper,
  deletePastPaper,
  getPastPaperDetails,
  downloadPastPaperAdmin,
  togglePastPaperStatus,
  updatePastPaperAccess,
  addAnswerKey,
  addMarkingScheme,
  getPastPapersAPI,
  // WhatsApp Notifications
  sendHomeworkNotificationAPI,
  sendDueDateRemindersAPI,
  sendCustomMessageAPI,
  sendMissedHomeworkSummaryAPI,
  // Utility Functions
  cleanupOrphanedContent,
};
