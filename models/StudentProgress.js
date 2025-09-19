const mongoose = require('mongoose');

const StudentProgressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  week: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Week',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'locked', 'unlocked'],
    default: 'not_started'
  },
  // Track completed materials by ID
  completedMaterials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeekContent'
  }],
  // Track homework submissions
  homeworkSubmissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HomeworkSubmission'
  }],
  // Overall progress score (0-100)
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  progress: {
    homework: {
      submitted: {
        type: Boolean,
        default: false
      },
      submittedAt: {
        type: Date
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      feedback: {
        type: String
      }
    },
    notes: {
      downloaded: {
        type: Boolean,
        default: false
      },
      downloadedAt: {
        type: Date
      },
      viewed: {
        type: Boolean,
        default: false
      },
      viewedAt: {
        type: Date
      }
    },
    quiz: {
      attempted: {
        type: Boolean,
        default: false
      },
      attemptedAt: {
        type: Date
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      attempts: {
        type: Number,
        default: 0
      }
    }
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  restrictions: {
    canAccessHomework: {
      type: Boolean,
      default: true
    },
    canAccessNotes: {
      type: Boolean,
      default: true
    },
    canAccessQuiz: {
      type: Boolean,
      default: true
    },
    canAccessWeek: {
      type: Boolean,
      default: true
    },
    reason: {
      type: String
    },
    restrictedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    restrictedAt: {
      type: Date
    }
  },
  // Week access control
  accessControl: {
    isUnlocked: {
      type: Boolean,
      default: false
    },
    unlockedAt: {
      type: Date
    },
    unlockedBy: {
      type: String,
      enum: ['auto', 'manual', 'admin'],
      default: 'auto'
    },
    unlockReason: {
      type: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
StudentProgressSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate overall score from individual scores
  const scores = [];
  if (this.progress.homework.score !== undefined) {
    scores.push(this.progress.homework.score);
  }
  if (this.progress.quiz.score !== undefined) {
    scores.push(this.progress.quiz.score);
  }
  
  if (scores.length > 0) {
    this.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
  
  // Update status based on progress
  if (this.score >= 100) {
    this.status = 'completed';
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else if (this.score > 0) {
    this.status = 'in_progress';
  } else if (this.accessControl && this.accessControl.isUnlocked) {
    this.status = 'unlocked';
  } else {
    this.status = 'not_started';
  }
  
  next();
});

// Static method to unlock next week when previous week is completed
StudentProgressSchema.statics.unlockNextWeek = async function(studentId, completedWeekNumber) {
  try {
    const Week = require('./Week');
    
    // Find the next week
    const nextWeek = await Week.findOne({
      weekNumber: completedWeekNumber + 1,
      isActive: true
    });
    
    if (!nextWeek) {
      console.log(`No next week found for week ${completedWeekNumber + 1}`);
      return null;
    }
    
    // Check if student progress already exists for next week
    let nextWeekProgress = await this.findOne({
      student: studentId,
      week: nextWeek._id
    });
    
    if (!nextWeekProgress) {
      // Create new progress record for next week
      nextWeekProgress = new this({
        student: studentId,
        week: nextWeek._id,
        status: 'unlocked',
        accessControl: {
          isUnlocked: true,
          unlockedAt: new Date(),
          unlockedBy: 'auto',
          unlockReason: `Previous week ${completedWeekNumber} completed`
        }
      });
      await nextWeekProgress.save();
      console.log(`Week ${completedWeekNumber + 1} unlocked for student ${studentId}`);
    } else if (!nextWeekProgress.accessControl.isUnlocked) {
      // Update existing progress to unlock
      nextWeekProgress.accessControl.isUnlocked = true;
      nextWeekProgress.accessControl.unlockedAt = new Date();
      nextWeekProgress.accessControl.unlockedBy = 'auto';
      nextWeekProgress.accessControl.unlockReason = `Previous week ${completedWeekNumber} completed`;
      nextWeekProgress.status = 'unlocked';
      await nextWeekProgress.save();
      console.log(`Week ${completedWeekNumber + 1} unlocked for student ${studentId}`);
    }
    
    return nextWeekProgress;
  } catch (error) {
    console.error('Error unlocking next week:', error);
    throw error;
  }
};

// Index for efficient queries
StudentProgressSchema.index({ student: 1, week: 1 }, { unique: true });
StudentProgressSchema.index({ student: 1, status: 1 });
StudentProgressSchema.index({ week: 1, status: 1 });
StudentProgressSchema.index({ lastAccessed: -1 });

module.exports = mongoose.model('StudentProgress', StudentProgressSchema);
