const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Function to generate unique student code
const generateStudentCode = async () => {
  const chars = '0123456789#$@';
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = 'STD';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existingUser = await mongoose
      .model('User')
      .findOne({ studentCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return code;
};

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  age: {
    type: Number,
    required: true,
    min: 10,
    max: 100,
  },
  year: {
    type: String,
    required: true,
    enum: ['Year 8', 'Year 9', 'Year 10'],
  },
  schoolName: {
    type: String,
    required: true,
    trim: true,
  },
  studentCode: {
    type: String,
    unique: true,
    trim: true,
  },
  studentPhoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
      },
      message: 'Please enter a valid student phone number',
    },
  },
  parentPhoneNumber: {
    type: String,
    required: true,
    validate: [
      {
        validator: function (v) {
          return /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
        },
        message: 'Please enter a valid parent phone number',
      },
      {
        validator: function (v) {
          return this.studentPhoneNumber !== v;
        },
        message:
          'Parent phone number must be different from student phone number',
      },
    ],
  },
  curriculum: {
    type: String,
    required: true,
    enum: ['Cambridge', 'Edexcel'],
  },
  studentType: {
    type: String,
    required: true,
    enum: ['School', 'Center', 'Online'],
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
  },
  isActive: {
    type: Boolean,
    default: false, // Users need admin activation
  },
  // Progress tracking
  currentWeek: {
    type: Number,
    default: 1
  },
  totalProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  completedWeeks: [{
    weekNumber: {
      type: Number,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  // Overall progress statistics
  overallProgress: {
    totalMaterialsViewed: {
      type: Number,
      default: 0
    },
    totalMaterialsCompleted: {
      type: Number,
      default: 0
    },
    totalStudyTime: {
      type: Number,
      default: 0 // in minutes
    },
    lastActivityDate: {
      type: Date,
      default: Date.now
    }
  },
  // Restrictions
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
    canAccessWeeks: {
      type: Boolean,
      default: true
    },
    canAccessPastPapers: {
      type: Boolean,
      default: true
    },
    restrictedWeeks: [{
      weekNumber: {
        type: Number,
        required: true
      },
      reason: {
        type: String
      },
      restrictedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Statistics
  statistics: {
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0
    },
    homeworkSubmitted: {
      type: Number,
      default: 0
    },
    notesDownloaded: {
      type: Number,
      default: 0
    },
    quizzesAttempted: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Generate student code if it's a new user
  if (this.isNew && !this.studentCode) {
    try {
      this.studentCode = await generateStudentCode();
    } catch (error) {
      return next(error);
    }
  }

  // Hash password if modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

