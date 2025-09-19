const User = require('../models/User');
const Week = require('../models/Week');
const PastPaper = require('../models/PastPaper');
const YearContent = require('../models/YearContent');
const StudentProgress = require('../models/StudentProgress');
const Note = require('../models/Note');
const WeekContent = require('../models/WeekContent');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const cloudinary = require('cloudinary').v2;

// Helper function to initialize first week for new students
const initializeFirstWeek = async (student) => {
  try {
    // Check if student has any progress records
    const existingProgress = await StudentProgress.findOne({ student: student._id });
    
    if (!existingProgress) {
      // Find the first week for this student's year, type, and curriculum
      const firstWeek = await Week.findOne({
        weekNumber: 1,
        year: student.year,
        curriculum: student.curriculum, // Filter by curriculum
        studentType: student.studentType,
        isActive: true
      });
      
      if (firstWeek) {
        // Create progress record for first week
        const firstWeekProgress = new StudentProgress({
          student: student._id,
          week: firstWeek._id,
          status: 'unlocked',
          accessControl: {
            isUnlocked: true,
            unlockedAt: new Date(),
            unlockedBy: 'auto',
            unlockReason: 'First week automatically unlocked for new student'
          }
        });
        
        await firstWeekProgress.save();
        console.log(`First week initialized for student ${student._id}`);
      }
    }
  } catch (error) {
    console.error('Error initializing first week:', error);
  }
};

// GET - Student Dashboard
const getStudentDashboard = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      req.flash('error_msg', 'Please log in to access your dashboard');
      return res.redirect('/auth/login');
    }

    // Get full user data from database
    const student = await User.findById(user.id);
    if (!student) {
      req.flash('error_msg', 'Student not found');
      return res.redirect('/auth/login');
    }

    // Initialize first week if needed
    await initializeFirstWeek(student);

    // Get dynamic data for the student's year and type
    const [weeks, pastPapers, yearContent, studentProgress] = await Promise.all([
      // Get weeks for the student's year, type, and curriculum
      Week.find({
        year: student.year,
        curriculum: student.curriculum, // Filter by curriculum
        studentType: student.studentType,
        isActive: true
      }).sort({ weekNumber: 1 }),
      
      // Get past papers for the student's year, type, and curriculum with access control
      // Check if student has access to past papers
      student.restrictions && student.restrictions.canAccessPastPapers === false ? 
        [] : 
        PastPaper.find({
          year: student.year,
          curriculum: student.curriculum, // Filter by curriculum
          $or: [
            { studentType: student.studentType },
            { studentType: 'ALL' }
          ],
          isActive: true,
          $or: [
            { 'accessControl.accessLevel': 'public' },
            { 'accessControl.accessLevel': 'restricted', 'accessControl.allowedStudents': student._id },
            { 'accessControl.accessLevel': 'private', 'accessControl.allowedStudents': student._id }
          ],
          'accessControl.restrictedStudents': { $ne: student._id }
        }).sort({ examYear: -1, paperType: 1 }),
      
      // Get year content for the student's year, type, and curriculum
      YearContent.findOne({
        year: student.year,
        curriculum: student.curriculum, // Filter by curriculum
        studentType: student.studentType,
        isActive: true
      }),
      
      // Get student's progress (filter out any with null week)
      StudentProgress.find({
        student: student._id,
        week: { $ne: null }
      }).populate('week', 'title weekNumber')
    ]);

    // Calculate progress statistics
    const totalWeeks = weeks.length;
    const completedWeeks = studentProgress.filter(p => p.status === 'completed').length;
    const currentWeek = student.currentWeek || 1;
    
    // Calculate overall progress based on completed weeks vs total weeks
    let progressPercentage = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;
    
    // Get progress for each week
    const weeksWithProgress = await Promise.all(weeks.map(async (week) => {
      try {
        const weekProgress = studentProgress.find(p => p.week && p.week.toString() === week._id.toString());
        const weekMaterials = await getWeekMaterials(week._id);
        const weekHomeworkSubmissions = await getHomeworkSubmissions(student._id, week._id);
      
        // Calculate week progress
        let weekProgressPercentage = 0;
        let completedMaterials = 0;
        
        // Get total materials (now includes both WeekContent and Week.materials)
        const totalWeekMaterials = weekMaterials.length;
        
        if (totalWeekMaterials > 0) {
          completedMaterials = weekMaterials.filter(material => {
            if (material.type === 'homework') {
              const submission = weekHomeworkSubmissions.find(sub => 
                sub.materialId === material._id || 
                (material.originalMaterialId && sub.materialId === material.originalMaterialId)
              );
              return submission && (submission.status === 'submitted' || submission.status === 'graded');
            } else {
              return weekProgress && weekProgress.completedMaterials && 
                     (weekProgress.completedMaterials.includes(material._id) ||
                      (material.originalMaterialId && weekProgress.completedMaterials.includes(material.originalMaterialId)));
            }
          }).length;
          
          weekProgressPercentage = Math.round((completedMaterials / totalWeekMaterials) * 100);
        }

        // Use the progress score from the database if available, otherwise use calculated percentage
        const finalProgressPercentage = (weekProgress && weekProgress.score !== undefined) ? 
          weekProgress.score : weekProgressPercentage;

        // Determine if week is accessible
        const isCompleted = weekProgress && weekProgress.status === 'completed';
        const isUnlocked = weekProgress && weekProgress.accessControl && weekProgress.accessControl.isUnlocked;
        const isCurrentWeek = week.weekNumber === student.currentWeek;
        const isPreviousWeek = week.weekNumber < student.currentWeek;
        
        // Check if week depends on previous week completion
        const dependsOnPreviousWeek = week.unlockConditions && week.unlockConditions.dependsOnPreviousWeek;
        
        // Week is accessible if:
        // 1. It's completed
        // 2. It's manually unlocked
        // 3. It's current week
        // 4. It's a previous week
        // 5. It doesn't depend on previous week completion (dependsOnPreviousWeek = false)
        // 6. It's the first week (weekNumber = 1)
        const isAccessible = isCompleted || isUnlocked || isCurrentWeek || isPreviousWeek || 
                            !dependsOnPreviousWeek || week.weekNumber === 1;

        // No need to accumulate progress for overall calculation anymore

        return {
          ...week.toObject(),
          progress: weekProgress ? {
            ...weekProgress.toObject(),
            score: finalProgressPercentage
          } : null,
          progressPercentage: finalProgressPercentage,
          totalMaterials: totalWeekMaterials,
          completedMaterials: completedMaterials,
          totalTopics: totalWeekMaterials, // Use total materials count as topics
          studyTimeHours: totalWeekMaterials > 0 ? 
            Math.round(weekMaterials.reduce((total, material) => total + (material.estimatedTime || 30), 0) / 60 * 10) / 10 : 0,
          isAccessible: isAccessible,
          isCompleted: isCompleted,
          isUnlocked: isUnlocked,
          isCurrentWeek: isCurrentWeek
        };
      } catch (weekError) {
        console.error('Error processing week:', week._id, weekError);
        // Return a default week object if there's an error
        return {
          ...week.toObject(),
          progress: null,
          progressPercentage: 0,
          totalMaterials: 0,
          completedMaterials: 0,
          totalTopics: 0,
          studyTimeHours: 0,
          isAccessible: false,
          isCompleted: false,
          isUnlocked: false,
          isCurrentWeek: false
        };
      }
    }));

    // Progress percentage is already calculated above based on completed weeks

    // Group past papers by type
    const papersByType = {};
    pastPapers.forEach(paper => {
      if (!papersByType[paper.paperType]) {
        papersByType[paper.paperType] = [];
      }
      papersByType[paper.paperType].push(paper);
    });

    res.render('Student/dashboard', {
      title: 'Student Dashboard',
      student: student,
      user: user,
      weeks: weeksWithProgress,
      pastPapers: pastPapers,
      papersByType: papersByType,
      yearContent: yearContent,
      studentProgress: studentProgress,
      progressStats: {
        totalWeeks: totalWeeks,
        completedWeeks: completedWeeks,
        currentWeek: currentWeek,
        progressPercentage: progressPercentage
      },
      layout: false,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'An error occurred while loading your dashboard');
    res.redirect('/auth/login');
  }
};

// GET - Year Selection Page
const getYearSelection = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      req.flash('error_msg', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    const student = await User.findById(user.id);
    if (!student) {
      req.flash('error_msg', 'Student not found');
      return res.redirect('/auth/login');
    }

    res.render('Student/year-selection', {
      title: 'Select Your Year',
      student: student,
      user: user,
      layout: false,
    });
  } catch (error) {
    console.error('Year selection error:', error);
    req.flash(
      'error_msg',
      'An error occurred while loading the year selection'
    );
    res.redirect('/auth/login');
  }
};

// POST - Update Learning Mode (Year is already set during registration)
const updateYearAndMode = async (req, res) => {
  try {
    const { year, studentType } = req.body;
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    // Get current user data
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Validate that the year matches the user's registered year
    if (year !== currentUser.year) {
      return res.status(400).json({
        success: false,
        message: `You can only access ${currentUser.year}. Please select your registered year.`,
      });
    }

    // For the new flow, we don't change the studentType since it's assigned during registration
    // Just update the last activity
    await User.findByIdAndUpdate(user.id, {
      lastActivity: new Date(),
    });

    res.json({
      success: true,
      message: 'Access granted to learning content',
      redirectUrl: '/student/dashboard',
      studentType: currentUser.studentType, // Return the assigned type
    });
  } catch (error) {
    console.error('Update year and mode error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
    });
  }
};

// GET - Learning Content based on year and mode
const getLearningContent = async (req, res) => {
  try {
    const user = req.session.user;
    const { year, mode } = req.params;

    if (!user) {
      req.flash('error_msg', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    const student = await User.findById(user.id);
    if (!student) {
      req.flash('error_msg', 'Student not found');
      return res.redirect('/auth/login');
    }

    res.render('Student/learning-content', {
      title: `${year} - ${mode} Learning`,
      student: student,
      user: user,
      selectedYear: year,
      learningMode: mode,
      layout: false,
    });
  } catch (error) {
    console.error('Learning content error:', error);
    req.flash(
      'error_msg',
      'An error occurred while loading the learning content'
    );
    res.redirect('/student/dashboard');
  }
};

// GET - Week Details with Notes and Materials
const getWeekDetails = async (req, res) => {
  try {
    const user = req.session.user;
    const { weekId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get week details
    const week = await Week.findOne({
      _id: weekId,
      year: student.year,
      curriculum: student.curriculum, // Filter by curriculum
      studentType: student.studentType,
      isActive: true
    });

    if (!week) {
      return res.status(404).json({ success: false, message: 'Week not found' });
    }

    // Get notes for this week
    const notes = await Note.find({
      week: weekId,
      isActive: true
    }).sort({ createdAt: -1 });

    // Get student's progress for this week
    const progress = await StudentProgress.findOne({
      student: student._id,
      week: weekId
    });

    res.json({
      success: true,
      week: week,
      notes: notes,
      progress: progress
    });
  } catch (error) {
    console.error('Get week details error:', error);
    res.status(500).json({ success: false, message: 'Error loading week details' });
  }
};

// GET - Download Note
const downloadNote = async (req, res) => {
  try {
    const user = req.session.user;
    const { noteId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const note = await Note.findById(noteId).populate('week');
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // Check if student has access to this note
    if (note.week.year !== student.year || note.week.studentType !== student.studentType) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if download is allowed
    if (!note.allowDownload) {
      return res.status(403).json({ success: false, message: 'Download not allowed for this note' });
    }

    // Update download count
    await Note.findByIdAndUpdate(noteId, { $inc: { downloadCount: 1 } });

    res.json({
      success: true,
      downloadUrl: note.fileUrl,
      fileName: note.fileName
    });
  } catch (error) {
    console.error('Download note error:', error);
    res.status(500).json({ success: false, message: 'Error downloading note' });
  }
};

// GET - Download Past Paper
const downloadPastPaper = async (req, res) => {
  try {
    const user = req.session.user;
    const { paperId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const paper = await PastPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    // Check if student has access to this paper
    if (paper.year !== student.year || paper.curriculum !== student.curriculum || paper.studentType !== student.studentType) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if student has access to past papers in general
    if (student.restrictions && student.restrictions.canAccessPastPapers === false) {
      return res.status(403).json({ success: false, message: 'Access to past papers is restricted' });
    }

    // Check access control
    const hasAccess = checkPastPaperAccess(paper, student._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this past paper' });
    }

    // Update download count
    await PastPaper.findByIdAndUpdate(paperId, { $inc: { downloadCount: 1 } });

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

// GET - Week Content Page
const getWeekContent = async (req, res) => {
  try {
    const user = req.session.user;
    const { weekId } = req.params;

    if (!user) {
      req.flash('error_msg', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    const student = await User.findById(user.id);
    if (!student) {
      req.flash('error_msg', 'Student not found');
      return res.redirect('/auth/login');
    }

    // Get week details
    const week = await Week.findOne({
      _id: weekId,
      year: student.year,
      curriculum: student.curriculum, // Filter by curriculum
      studentType: student.studentType,
      isActive: true
    });

    if (!week) {
      req.flash('error_msg', 'Week not found or not accessible');
      return res.redirect('/student/dashboard');
    }

    // Check if student has access to this week
    const weekProgress = await StudentProgress.findOne({
      student: student._id,
      week: weekId
    });

    const isCompleted = weekProgress && weekProgress.status === 'completed';
    const isUnlocked = weekProgress && weekProgress.accessControl && weekProgress.accessControl.isUnlocked;
    const isCurrentWeek = week.weekNumber === student.currentWeek;
    const isPreviousWeek = week.weekNumber < student.currentWeek;
    const dependsOnPreviousWeek = week.unlockConditions && week.unlockConditions.dependsOnPreviousWeek;
    
    const hasAccess = isCompleted || isUnlocked || isCurrentWeek || isPreviousWeek || 
                     !dependsOnPreviousWeek || week.weekNumber === 1;

    if (!hasAccess) {
      req.flash('error_msg', 'You do not have access to this week yet. Complete the previous week first.');
      return res.redirect('/student/dashboard');
    }

    // Check if this is an API request
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      // Return JSON data for API calls
      console.log('API request for week:', weekId);
      const materials = await getWeekMaterials(weekId);
      const homeworkSubmissions = await getHomeworkSubmissions(user.id, weekId);
      
      // Get or create student's progress for this week
      let studentProgress = await StudentProgress.findOne({
        student: user.id,
        week: weekId
      });
      
      // If no progress exists, create one
      if (!studentProgress) {
        console.log('Creating new student progress for week:', weekId);
        
        // Calculate initial progress based on existing homework submissions
        let initialScore = 0;
        if (materials.length > 0) {
          let completedCount = 0;
          materials.forEach(material => {
            if (material.type === 'homework') {
              const submission = homeworkSubmissions.find(sub => 
                sub.materialId === material._id || sub.materialId === material.originalMaterialId
              );
              if (submission && (submission.status === 'submitted' || submission.status === 'graded')) {
                completedCount++;
              }
            }
          });
          initialScore = Math.round((completedCount / materials.length) * 100);
        }
        
        studentProgress = new StudentProgress({
          student: user.id,
          week: weekId,
          completedMaterials: [],
          homeworkSubmissions: homeworkSubmissions.map(sub => sub._id),
          progress: {
            score: initialScore,
            status: initialScore >= 100 ? 'completed' : 'in_progress'
          }
        });
        await studentProgress.save();
        console.log('Student progress created with score:', initialScore);
      }
      
      console.log('API response - Materials:', materials.length);
      console.log('API response - Homework submissions:', homeworkSubmissions.length);
      console.log('API response - Student progress:', studentProgress);
      
      res.json({
        success: true,
        materials,
        homeworkSubmissions,
        studentProgress
      });
    } else {
      // Render the week content page
      res.render('Student/week-content', {
        title: `Week ${week.weekNumber}: ${week.title}`,
        student: student,
        user: user,
        week: week,
        layout: false,
      });
    }
  } catch (error) {
    console.error('Get week content error:', error);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.status(500).json({ success: false, message: 'Error loading week content' });
    } else {
      req.flash('error_msg', 'An error occurred while loading week content');
      res.redirect('/student/dashboard');
    }
  }
};

// Helper function to get week materials
const getWeekMaterials = async (weekId) => {
  try {
    console.log('Getting materials for week:', weekId);
    
    // Get content from WeekContent model (primary source)
    const weekContentMaterials = await WeekContent.find({ week: weekId, isActive: true })
      .select('title description type content fileUrl fileName fileType fileSize isSecure allowDownload previewUrl cloudinaryPublicId isRequired dueDate dueDateTime dueDateOnly dueTime timezone allowLateSubmission latePenalty maxScore estimatedTime order isActive week createdBy createdAt updatedAt')
      .sort({ order: 1, createdAt: 1 });
    
    // Get materials from Week model (fallback/legacy source)
    const week = await Week.findById(weekId);
    const weekMaterials = week && week.materials ? week.materials : [];
    
    // Combine materials from both sources
    let allMaterials = [...weekContentMaterials];
    
    // Only add materials from Week.materials if they don't already exist in WeekContent
    if (weekMaterials.length > 0) {
      // Convert Week.materials to the same format as WeekContent
      const convertedWeekMaterials = weekMaterials.map((material, index) => {
        // Create a unique ID for week materials
        const materialId = `week-material-${material._id || index}`;
        
        return {
          _id: materialId,
          title: material.title,
          description: material.description,
          type: material.type,
          fileUrl: material.fileUrl,
          fileName: material.fileName,
          fileType: material.fileType,
          fileSize: material.fileSize,
          isSecure: material.isSecure,
          allowDownload: material.allowDownload,
          previewUrl: material.previewUrl,
          isRequired: material.isRequired,
          dueDate: material.dueDate,
          dueDateTime: material.dueDateTime,
          dueDateOnly: material.dueDateOnly,
          dueTime: material.dueTime,
          timezone: material.timezone || 'UTC',
          allowLateSubmission: material.allowLateSubmission || false,
          latePenalty: material.latePenalty || 0,
          maxScore: material.maxScore,
          estimatedTime: material.estimatedTime,
          order: index,
          isActive: true,
          week: weekId,
          isWeekMaterial: true, // Flag to identify week materials
          originalMaterialId: material._id // Keep track of original ID for homework submissions
        };
      });
      
      // Filter out week materials that already exist in WeekContent
      const uniqueWeekMaterials = convertedWeekMaterials.filter(weekMaterial => {
        return !weekContentMaterials.some(wcMaterial => 
          wcMaterial.title === weekMaterial.title && 
          wcMaterial.type === weekMaterial.type &&
          (wcMaterial.fileName === weekMaterial.fileName || 
           (!wcMaterial.fileName && !weekMaterial.fileName))
        );
      });
      
      // Add unique week materials to the combined list
      allMaterials = [...allMaterials, ...uniqueWeekMaterials];
      
      console.log('WeekContent materials:', weekContentMaterials.length);
      console.log('Unique Week materials added:', uniqueWeekMaterials.length);
    }
    
    console.log('Total materials found:', allMaterials.length);
    return allMaterials;
  } catch (error) {
    console.error('Error getting week materials:', error);
    return [];
  }
};

// Helper function to get homework submissions
const getHomeworkSubmissions = async (studentId, weekId) => {
  try {
    const submissions = await HomeworkSubmission.find({
      student: studentId,
      week: weekId
    }).sort({ submittedAt: -1 });

    return submissions;
  } catch (error) {
    console.error('Error getting homework submissions:', error);
    return [];
  }
};

// Helper function to check past paper access
const checkPastPaperAccess = (paper, studentId) => {
  // Check if student is restricted
  if (paper.accessControl.restrictedStudents && 
      paper.accessControl.restrictedStudents.includes(studentId)) {
    return false;
  }

  // Check access level
  switch (paper.accessControl.accessLevel) {
    case 'public':
      return true;
    case 'restricted':
      return paper.accessControl.allowedStudents && 
             paper.accessControl.allowedStudents.includes(studentId);
    case 'private':
      return paper.accessControl.allowedStudents && 
             paper.accessControl.allowedStudents.includes(studentId);
    default:
      return false;
  }
};

// POST - Submit Homework
const submitHomework = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const { weekId, materialId, title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File size must be less than 10MB' });
    }

    // Check if homework assignment exists and get due date info
    const homeworkAssignment = await WeekContent.findOne({
      _id: materialId,
      type: 'homework'
    });

    if (!homeworkAssignment) {
      return res.status(404).json({ success: false, message: 'Homework assignment not found' });
    }

    // Check if student has already submitted this homework
    const existingSubmission = await HomeworkSubmission.findOne({
      student: user.id,
      week: weekId,
      materialId: materialId
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted this homework assignment. Only one submission per assignment is allowed.' 
      });
    }

    // Check if submission is allowed based on due date
    const now = new Date();
    const dueDateTime = homeworkAssignment.dueDateTime ? new Date(homeworkAssignment.dueDateTime) : null;
    
    if (dueDateTime && now > dueDateTime) {
      // Assignment is overdue
      if (!homeworkAssignment.allowLateSubmission) {
        return res.status(400).json({ 
          success: false, 
          message: 'Assignment deadline has passed. Late submissions are not allowed.' 
        });
      }
      
      // Calculate late penalty if applicable
      const latePenalty = homeworkAssignment.calculateLatePenalty(now);
      if (latePenalty > 0) {
        console.log(`Late submission penalty: ${latePenalty}%`);
      }
    }

    // Upload file to Cloudinary
    const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const uploadResult = await cloudinary.uploader.upload(fileBase64, {
      folder: `mr-mohrr7am/homework-submissions/${weekId}`,
      resource_type: 'raw',
      upload_preset: 'order_project',
      use_filename: true,
      unique_filename: false
    });

    if (!uploadResult.secure_url) {
      return res.status(500).json({ success: false, message: 'File upload failed' });
    }

    // Determine file type for the files array
    let fileType = 'other';
    if (file.mimetype.includes('pdf')) fileType = 'pdf';
    else if (file.mimetype.includes('doc')) fileType = 'doc';
    else if (file.mimetype.includes('image')) fileType = 'image';

    // Determine if this is a late submission
    const isLate = dueDateTime && now > dueDateTime;
    const latePenalty = isLate ? homeworkAssignment.calculateLatePenalty(now) : 0;
    
    // Create homework submission
    const submission = new HomeworkSubmission({
      student: user.id,
      week: weekId,
      materialId: materialId,
      title: title,
      description: description || '',
      files: [{
        fileName: file.originalname,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileType: fileType,
        fileSize: file.size,
        uploadDate: new Date()
      }],
      status: isLate ? 'late' : 'submitted',
      submittedAt: new Date(),
      isLate: isLate,
      latePenalty: latePenalty,
      notifications: {
        submissionNotified: false,
        submissionNotificationStatus: 'pending'
      }
    });

    await submission.save();

    // Update student progress for this week
    const student = await User.findById(user.id);
    const week = await Week.findById(weekId);
    
    if (student && week) {
      // Get or create student progress for this week
      let progress = await StudentProgress.findOne({
        student: user.id,
        week: weekId
      });
      
      if (!progress) {
        progress = new StudentProgress({
          student: user.id,
          week: weekId,
          completedMaterials: [],
          homeworkSubmissions: [],
          progress: {
            score: 0,
            status: 'in_progress'
          }
        });
      }
      
      // Add this homework submission to the progress
      if (!progress.homeworkSubmissions) {
        progress.homeworkSubmissions = [];
      }
      if (!progress.homeworkSubmissions.includes(submission._id)) {
        progress.homeworkSubmissions.push(submission._id);
      }
      
      // Recalculate progress score
      const materials = await getWeekMaterials(weekId);
      const homeworkSubmissions = await getHomeworkSubmissions(user.id, weekId);
      
      let completedCount = 0;
      materials.forEach(material => {
        if (material.type === 'homework') {
          const submission = homeworkSubmissions.find(sub => 
            sub.materialId === material._id || sub.materialId === material.originalMaterialId
          );
          if (submission && (submission.status === 'submitted' || submission.status === 'graded')) {
            completedCount++;
          }
        } else {
          if (progress.completedMaterials && progress.completedMaterials.includes(material._id)) {
            completedCount++;
          }
        }
      });
      
      const progressScore = materials.length > 0 ? Math.round((completedCount / materials.length) * 100) : 0;
      progress.score = progressScore;
      progress.status = progressScore >= 100 ? 'completed' : 'in_progress';
      
      await progress.save();
      
      // If week is completed, update user's current week and unlock next week
      if (progressScore >= 100 && student.currentWeek === week.weekNumber) {
        student.currentWeek = week.weekNumber + 1;
        
        // Add to completed weeks if not already there
        const weekAlreadyCompleted = student.completedWeeks.some(cw => cw.weekNumber === week.weekNumber);
        if (!weekAlreadyCompleted) {
          student.completedWeeks.push({
            weekNumber: week.weekNumber,
            completedAt: new Date(),
            score: progressScore
          });
        }
        
        // Update overall progress
        student.overallProgress.totalMaterialsCompleted += completedCount;
        student.overallProgress.lastActivityDate = new Date();
        
        await student.save();
        
        // Unlock the next week automatically
        try {
          await StudentProgress.unlockNextWeek(user.id, week.weekNumber);
          console.log(`Week ${week.weekNumber} completed via homework submission! Week ${week.weekNumber + 1} unlocked automatically.`);
        } catch (unlockError) {
          console.error('Error unlocking next week:', unlockError);
        }
      }
    }

    // Send WhatsApp notification to parent
    try {
      const notificationService = require('../utils/notificationService');
      // Send notification asynchronously (don't wait for it to complete)
      notificationService.sendHomeworkSubmissionNotification(submission._id)
        .then(notificationResult => {
          if (notificationResult.success) {
            console.log(`WhatsApp notification sent for homework submission ${submission._id}`);
          } else {
            console.error(`Failed to send WhatsApp notification for submission ${submission._id}:`, notificationResult.error);
          }
        })
        .catch(err => {
          console.error(`Error in WhatsApp notification process for submission ${submission._id}:`, err);
        });
    } catch (notificationError) {
      console.error('Error initializing notification service:', notificationError);
      // Continue with the response even if notification fails
    }

    const responseMessage = isLate ? 
      `Homework submitted successfully! Note: This is a late submission${latePenalty > 0 ? ` with ${latePenalty}% penalty` : ''}.` :
      'Homework submitted successfully!';
    
    res.json({
      success: true,
      message: responseMessage,
      submission: {
        _id: submission._id,
        title: submission.title,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
        status: submission.status,
        isLate: isLate,
        latePenalty: latePenalty
      }
    });
  } catch (error) {
    console.error('Submit homework error:', error);
    res.status(500).json({ success: false, message: 'Error submitting homework' });
  }
};

// GET - Get Homework Submission
const getHomeworkSubmission = async (req, res) => {
  try {
    const user = req.session.user;
    const { submissionId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const submission = await HomeworkSubmission.findOne({
      _id: submissionId,
      student: user.id
    }).populate('week', 'title weekNumber');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({
      success: true,
      submission: {
        _id: submission._id,
        title: submission.title,
        description: submission.description,
        fileName: submission.fileName,
        fileType: submission.fileType,
        fileSize: submission.fileSize,
        fileUrl: submission.fileUrl,
        status: submission.status,
        score: submission.score,
        feedback: submission.feedback,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
        week: submission.week
      }
    });
  } catch (error) {
    console.error('Get homework submission error:', error);
    res.status(500).json({ success: false, message: 'Error loading submission' });
  }
};

// Secure PDF viewing function
const getSecurePDF = async (req, res) => {
  try {
    const user = req.session.user;
    const { materialId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Find the material (either in WeekContent or Week.materials)
    let material = null;
    
    // Check if it's a synthetic ID (starts with 'week-material-')
    if (materialId.startsWith('week-material-')) {
      // Extract the original material ID
      const originalMaterialId = materialId.replace('week-material-', '');
      
      // Find in Week.materials using the original ID
      const week = await Week.findOne({ 
        'materials._id': originalMaterialId,
        year: student.year,
        studentType: student.studentType,
        isActive: true
      });
      
      if (week) {
        material = week.materials.find(m => m._id.toString() === originalMaterialId);
      }
    } else {
      // Try to find in WeekContent first
      material = await WeekContent.findOne({ _id: materialId, isActive: true });
      
      if (!material) {
        // Check in Week.materials
        const week = await Week.findOne({ 
          'materials._id': materialId,
          year: student.year,
          studentType: student.studentType,
          isActive: true
        });
        
        if (week) {
          material = week.materials.find(m => m._id.toString() === materialId);
        }
      }
    }

    if (!material || (material.type !== 'pdf' && material.type !== 'el-5olasa')) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }
    
    // For el-5olasa, check if it actually has a PDF file
    if (material.type === 'el-5olasa') {
      const isPDF = material.fileType === 'application/pdf' || 
                    (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
      if (!isPDF) {
        return res.status(404).json({ success: false, message: 'PDF not found' });
      }
    }

    if (!material.fileUrl) {
      return res.status(404).json({ success: false, message: 'PDF file not available' });
    }

    // Set headers to prevent caching and downloading
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + (material.fileName || 'document.pdf') + '"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Fetch the PDF from Cloudinary and stream it
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse(material.fileUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SecurePDFViewer/1.0)'
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Set the same headers for the response
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/pdf');
      res.setHeader('Content-Length', proxyRes.headers['content-length']);
      
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Error fetching PDF:', error);
      res.status(500).json({ success: false, message: 'Error loading PDF' });
    });

    proxyReq.end();

  } catch (error) {
    console.error('Get secure PDF error:', error);
    res.status(500).json({ success: false, message: 'Error loading PDF' });
  }
};

// Download PDF function
const downloadPDF = async (req, res) => {
  try {
    const user = req.session.user;
    const { materialId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Find the material (either in WeekContent or Week.materials)
    let material = null;
    
    // Check if it's a synthetic ID (starts with 'week-material-')
    if (materialId.startsWith('week-material-')) {
      // Extract the original material ID
      const originalMaterialId = materialId.replace('week-material-', '');
      
      // Find in Week.materials using the original ID
      const week = await Week.findOne({ 
        'materials._id': originalMaterialId,
        year: student.year,
        studentType: student.studentType,
        isActive: true
      });
      
      if (week) {
        material = week.materials.find(m => m._id.toString() === originalMaterialId);
      }
    } else {
      // Try to find in WeekContent first
      material = await WeekContent.findOne({ _id: materialId, isActive: true });
      
      if (!material) {
        // Check in Week.materials
        const week = await Week.findOne({ 
          'materials._id': materialId,
          year: student.year,
          studentType: student.studentType,
          isActive: true
        });
        
        if (week) {
          material = week.materials.find(m => m._id.toString() === materialId);
        }
      }
    }

    if (!material || (material.type !== 'pdf' && material.type !== 'el-5olasa')) {
      return res.status(404).json({ success: false, message: 'PDF not found' });
    }
    
    // For el-5olasa, check if it actually has a PDF file
    if (material.type === 'el-5olasa') {
      const isPDF = material.fileType === 'application/pdf' || 
                    (material.fileName && material.fileName.toLowerCase().endsWith('.pdf'));
      if (!isPDF) {
        return res.status(404).json({ success: false, message: 'PDF not found' });
      }
    }

    if (!material.fileUrl) {
      return res.status(404).json({ success: false, message: 'PDF file not available' });
    }

    // Check if download is allowed
    if (material.allowDownload === false) {
      return res.status(403).json({ success: false, message: 'Download not allowed for this file' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${material.fileName || 'document.pdf'}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Fetch the PDF from Cloudinary and stream it
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse(material.fileUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDFDownloader/1.0)'
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Forward content length if available
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      
      // Pipe the PDF data directly to the response
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Error fetching PDF for download:', error);
      res.status(500).json({ success: false, message: 'Error downloading PDF' });
    });

    proxyReq.end();

  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ success: false, message: 'Error downloading PDF' });
  }
};

// Mark content as completed function
const markContentAsCompleted = async (req, res) => {
  try {
    const user = req.session.user;
    const { materialId, type, weekId } = req.body;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Only allow marking non-homework content as completed by viewing
    if (type === 'homework') {
      return res.status(400).json({ 
        success: false, 
        message: 'Homework must be submitted to be marked as completed' 
      });
    }

    // Find or create student progress record
    let progress = await StudentProgress.findOne({
      student: user.id,
      week: weekId
    });

    if (!progress) {
      progress = new StudentProgress({
        student: user.id,
        week: weekId,
        completedMaterials: [],
        status: 'in_progress',
        score: 0
      });
    }

    // Initialize completedMaterials array if it doesn't exist
    if (!progress.completedMaterials) {
      progress.completedMaterials = [];
    }

    // Convert synthetic ID to actual material ID for storage
    let actualMaterialId = materialId;
    if (materialId.startsWith('week-material-')) {
      actualMaterialId = materialId.replace('week-material-', '');
    }
    
    // Add material to completed list if not already there
    if (!progress.completedMaterials.includes(actualMaterialId)) {
      progress.completedMaterials.push(actualMaterialId);
      
      // Calculate progress percentage - get all materials from both WeekContent and Week.materials
      const allMaterials = await getWeekMaterials(weekId);
      const homeworkSubmissions = await getHomeworkSubmissions(user.id, weekId);
      
      let completedCount = 0;
      allMaterials.forEach(material => {
        if (material.type === 'homework') {
          const submission = homeworkSubmissions.find(sub => 
            sub.materialId === material._id || sub.materialId === material.originalMaterialId
          );
          if (submission && (submission.status === 'submitted' || submission.status === 'graded')) {
            completedCount++;
          }
        } else {
          // Check if this material is completed (handle both synthetic and real IDs)
          const materialIdToCheck = material._id || material.originalMaterialId;
          if (progress.completedMaterials && 
              (progress.completedMaterials.includes(material._id) || 
               progress.completedMaterials.includes(materialIdToCheck) ||
               (material.originalMaterialId && progress.completedMaterials.includes(material.originalMaterialId)))) {
            completedCount++;
          }
        }
      });
      
      progress.score = allMaterials.length > 0 ? Math.round((completedCount / allMaterials.length) * 100) : 0;
      
      // Update status based on completion
      if (progress.score >= 100) {
        progress.status = 'completed';
        // Update user's current week if this week is completed
        const week = await Week.findById(weekId);
        if (week && week.weekNumber === student.currentWeek) {
          // Check if this week is not already in completedWeeks
          const existingCompletedWeek = student.completedWeeks.find(cw => cw.weekNumber === week.weekNumber);
          if (!existingCompletedWeek) {
            await User.findByIdAndUpdate(user.id, {
              $inc: { currentWeek: 1 },
              $push: {
                completedWeeks: {
                  weekNumber: week.weekNumber,
                  completedAt: new Date(),
                  score: progress.score
                }
              }
            });
            
            // Unlock the next week automatically
            try {
              await StudentProgress.unlockNextWeek(user.id, week.weekNumber);
              console.log(`Week ${week.weekNumber} completed! Week ${week.weekNumber + 1} unlocked automatically.`);
            } catch (unlockError) {
              console.error('Error unlocking next week:', unlockError);
            }
          }
        }
      } else if (progress.score > 0) {
        progress.status = 'in_progress';
      }

      await progress.save();
      
      // Update user's overall progress
      await User.findByIdAndUpdate(user.id, {
        $inc: {
          'overallProgress.totalMaterialsViewed': 1,
          'overallProgress.totalMaterialsCompleted': 1
        },
        $set: {
          'overallProgress.lastActivityDate': new Date()
        }
      });
    }

    res.json({ 
      success: true, 
      message: 'Content marked as completed',
      progress: {
        score: progress.score,
        status: progress.status,
        completedMaterials: progress.completedMaterials.length
      },
      weekCompleted: progress.status === 'completed'
    });

  } catch (error) {
    console.error('Mark content as completed error:', error);
    res.status(500).json({ success: false, message: 'Error marking content as completed' });
  }
};

// GET - Preview Past Paper
const previewPastPaper = async (req, res) => {
  try {
    const user = req.session.user;
    const { paperId } = req.params;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const paper = await PastPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Past paper not found' });
    }

    // Check if student has access to this paper
    if (paper.year !== student.year || paper.curriculum !== student.curriculum || paper.studentType !== student.studentType) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if student has access to past papers in general
    if (student.restrictions && student.restrictions.canAccessPastPapers === false) {
      return res.status(403).json({ success: false, message: 'Access to past papers is restricted' });
    }

    // Check access control
    const hasAccess = checkPastPaperAccess(paper, student._id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this past paper' });
    }

    // Check if preview is allowed
    if (!paper.allowPreview) {
      return res.status(403).json({ success: false, message: 'Preview not allowed for this paper' });
    }

    // Update view count
    await PastPaper.findByIdAndUpdate(paperId, { $inc: { viewCount: 1 } });

    res.json({
      success: true,
      paper: {
        _id: paper._id,
        title: paper.title,
        description: paper.description,
        paperType: paper.paperType,
        examYear: paper.examYear,
        duration: paper.duration,
        totalMarks: paper.totalMarks,
        calculatorAllowed: paper.calculatorAllowed,
        difficulty: paper.difficulty,
        topics: paper.topics,
        fileUrl: paper.fileUrl,
        fileName: paper.fileName,
        previewPages: paper.previewPages,
        allowPreview: paper.allowPreview
      }
    });
  } catch (error) {
    console.error('Preview past paper error:', error);
    res.status(500).json({ success: false, message: 'Error previewing past paper' });
  }
};

// GET - Get Past Papers for Student
const getPastPapersForStudent = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }

    const student = await User.findById(user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if student has access to past papers in general
    if (student.restrictions && student.restrictions.canAccessPastPapers === false) {
      return res.json({
        success: true,
        pastPapers: [],
        papersByType: {}
      });
    }

    const pastPapers = await PastPaper.find({
      year: student.year,
      curriculum: student.curriculum, // Filter by curriculum
      $or: [
        { studentType: student.studentType },
        { studentType: 'ALL' }
      ],
      isActive: true,
      $or: [
        { 'accessControl.accessLevel': 'public' },
        { 'accessControl.accessLevel': 'restricted', 'accessControl.allowedStudents': student._id },
        { 'accessControl.accessLevel': 'private', 'accessControl.allowedStudents': student._id }
      ],
      'accessControl.restrictedStudents': { $ne: student._id }
    }).sort({ examYear: -1, paperType: 1 });

    // Group papers by type
    const papersByType = {};
    pastPapers.forEach(paper => {
      if (!papersByType[paper.paperType]) {
        papersByType[paper.paperType] = [];
      }
      papersByType[paper.paperType].push(paper);
    });

    res.json({
      success: true,
      pastPapers,
      papersByType
    });
  } catch (error) {
    console.error('Get past papers for student error:', error);
    res.status(500).json({ success: false, message: 'Error loading past papers' });
  }
};

// GET - View Past Paper Page
const viewPastPaper = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      req.flash('error_msg', 'Please log in to access this page');
      return res.redirect('/auth/login');
    }

    const { paperId } = req.params;
    const student = await User.findById(user.id);
    
    if (!student) {
      req.flash('error_msg', 'Student not found');
      return res.redirect('/student/dashboard');
    }

    const paper = await PastPaper.findById(paperId);
    if (!paper) {
      req.flash('error_msg', 'Past paper not found');
      return res.redirect('/student/dashboard');
    }

    // Check if student has access to this paper
    if (paper.year !== student.year || paper.curriculum !== student.curriculum || paper.studentType !== student.studentType) {
      req.flash('error_msg', 'Access denied');
      return res.redirect('/student/dashboard');
    }

    // Check if student has access to past papers in general
    if (student.restrictions && student.restrictions.canAccessPastPapers === false) {
      req.flash('error_msg', 'Access to past papers is restricted');
      return res.redirect('/student/dashboard');
    }

    // Check access control
    const hasAccess = checkPastPaperAccess(paper, student._id);
    if (!hasAccess) {
      req.flash('error_msg', 'Access denied to this past paper');
      return res.redirect('/student/dashboard');
    }

    // Update view count
    await PastPaper.findByIdAndUpdate(paperId, { $inc: { viewCount: 1 } });

    res.render('Student/view-paper', {
      title: `${paper.title} - Past Paper`,
      student: student,
      user: user,
      paper: paper,
      layout: false,
    });
  } catch (error) {
    console.error('View past paper error:', error);
    req.flash('error_msg', 'An error occurred while loading the past paper');
    res.redirect('/student/dashboard');
  }
};

module.exports = {
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
};
