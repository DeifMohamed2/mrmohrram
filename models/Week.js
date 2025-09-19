const mongoose = require('mongoose');

const WeekSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 52
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    required: true,
    enum: ['Year 8', 'Year 9', 'Year 10']
  },
  curriculum: {
    type: String,
    required: true,
    enum: ['Cambridge', 'Edexcel']
  },
  studentType: {
    type: String,
    required: true,
    enum: ['School', 'Center', 'Online']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  materials: [{
    type: {
      type: String,
      enum: ['homework', 'notes', 'pdf', 'el-5olasa'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    fileUrl: {
      type: String
    },
    fileName: {
      type: String
    },
    fileType: {
      type: String
    },
    fileSize: {
      type: Number
    },
    isSecure: {
      type: Boolean,
      default: false
    },
    allowDownload: {
      type: Boolean,
      default: true
    },
    previewUrl: {
      type: String
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    dueDate: {
      type: Date
    },
    maxScore: {
      type: Number,
      default: 100
    },
    estimatedTime: {
      type: Number, // in minutes
      default: 30
    }
  }],
  prerequisites: [{
    weekNumber: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    }
  }],
  // Week unlocking configuration
  unlockConditions: {
    requiresPreviousWeek: {
      type: Boolean,
      default: true
    },
    requiredCompletionPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    autoUnlock: {
      type: Boolean,
      default: true
    },
    dependsOnPreviousWeek: {
      type: Boolean,
      default: true,
      description: "If true, this week can only be accessed after completing the previous week"
    },
    manualUnlockOnly: {
      type: Boolean,
      default: false,
      description: "If true, this week can only be unlocked by an admin"
    },
    specificWeekDependencies: [{
      weekId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Week'
      },
      weekNumber: {
        type: Number
      },
      requiredCompletion: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
      }
    }]
  },
  learningObjectives: [{
    objective: {
      type: String,
      required: true
    },
    description: {
      type: String
    }
  }],
  assessmentCriteria: [{
    criterion: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    weight: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  resources: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['book', 'website', 'video', 'document', 'other']
    },
    url: {
      type: String
    },
    description: {
      type: String
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Virtual fields for dynamic stats
WeekSchema.virtual('totalTopics').get(function() {
  return this.materials ? this.materials.length : 0;
});

WeekSchema.virtual('totalStudyTime').get(function() {
  if (!this.materials) return 0;
  return this.materials.reduce((total, material) => {
    return total + (material.estimatedTime || 30);
  }, 0);
});

WeekSchema.virtual('studyTimeHours').get(function() {
  return Math.round(this.totalStudyTime / 60 * 10) / 10; // Round to 1 decimal place
});

// Update the updatedAt field before saving
WeekSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Include virtuals in JSON output
WeekSchema.set('toJSON', { virtuals: true });
WeekSchema.set('toObject', { virtuals: true });

// Index for efficient queries
WeekSchema.index({ weekNumber: 1, year: 1, curriculum: 1, studentType: 1 });
WeekSchema.index({ isActive: 1 });
WeekSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Week', WeekSchema);