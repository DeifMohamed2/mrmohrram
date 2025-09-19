const mongoose = require('mongoose');

const HomeworkSubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  week: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Week',
    required: true,
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    comment: 'ID of the homework material this submission is for'
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  files: [
    {
      fileName: {
        type: String,
        required: true,
      },
      fileUrl: {
        type: String,
        required: true,
      },
      publicId: {
        type: String, // For Cloudinary
      },
      fileType: {
        type: String,
        enum: ['pdf', 'doc', 'docx', 'image', 'other'],
        required: true,
      },
      fileSize: {
        type: Number, // in bytes
      },
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned', 'late'],
    default: 'submitted',
  },
  grade: {
    points: {
      type: Number,
      min: 0,
    },
    maxPoints: {
      type: Number,
      min: 1,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    letterGrade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
    },
  },
  feedback: {
    text: {
      type: String,
      trim: true,
    },
    feedbackFiles: [
      {
        fileName: {
          type: String,
        },
        fileUrl: {
          type: String,
        },
        publicId: {
          type: String,
        },
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: {
      type: Date,
    },
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 1,
    min: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware to calculate if submission is late
HomeworkSubmissionSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  if (this.isNew && this.week) {
    try {
      const Week = mongoose.model('Week');
      const week = await Week.findById(this.week);

      if (week && week.homework && week.homework.dueDate) {
        this.isLate = this.submissionDate > week.homework.dueDate;
        if (this.isLate && this.status === 'submitted') {
          this.status = 'late';
        }
      }
    } catch (error) {
      console.error('Error checking due date:', error);
    }
  }

  next();
});

// Calculate percentage when points are updated
HomeworkSubmissionSchema.pre('save', function (next) {
  if (this.grade && this.grade.points !== undefined && this.grade.maxPoints) {
    this.grade.percentage = Math.round(
      (this.grade.points / this.grade.maxPoints) * 100
    );

    // Auto-assign letter grade based on percentage
    const percentage = this.grade.percentage;
    if (percentage >= 97) this.grade.letterGrade = 'A+';
    else if (percentage >= 93) this.grade.letterGrade = 'A';
    else if (percentage >= 90) this.grade.letterGrade = 'A-';
    else if (percentage >= 87) this.grade.letterGrade = 'B+';
    else if (percentage >= 83) this.grade.letterGrade = 'B';
    else if (percentage >= 80) this.grade.letterGrade = 'B-';
    else if (percentage >= 77) this.grade.letterGrade = 'C+';
    else if (percentage >= 73) this.grade.letterGrade = 'C';
    else if (percentage >= 70) this.grade.letterGrade = 'C-';
    else if (percentage >= 67) this.grade.letterGrade = 'D+';
    else if (percentage >= 65) this.grade.letterGrade = 'D';
    else this.grade.letterGrade = 'F';
  }

  next();
});

// Index for efficient queries
HomeworkSubmissionSchema.index({ student: 1, week: 1 });
HomeworkSubmissionSchema.index({ submissionDate: 1 });
HomeworkSubmissionSchema.index({ status: 1 });

module.exports = mongoose.model('HomeworkSubmission', HomeworkSubmissionSchema);
