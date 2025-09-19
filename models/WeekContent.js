const mongoose = require('mongoose');

const WeekContentSchema = new mongoose.Schema({
  week: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Week',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['homework', 'notes', 'pdf', 'el-5olasa'],
    required: true
  },
  content: {
    type: String, // For text content or HTML
    trim: true
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
  cloudinaryPublicId: {
    type: String
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  dueDate: {
    type: Date
  },
  dueDateTime: {
    type: Date,
    required: function() {
      return this.type === 'homework';
    }
  },
  dueDateOnly: {
    type: Date,
    required: function() {
      return this.type === 'homework';
    }
  },
  dueTime: {
    type: String, // Store time as "HH:MM" format
    required: function() {
      return this.type === 'homework';
    }
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number, // Percentage penalty for late submission
    default: 0,
    min: 0,
    max: 100
  },
  maxScore: {
    type: Number,
    default: 100
  },
  estimatedTime: {
    type: Number, // in minutes
    default: 30
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Update the updatedAt field before saving
WeekContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual field to check if homework is overdue
WeekContentSchema.virtual('isOverdue').get(function() {
  if (this.type !== 'homework' || !this.dueDateTime) return false;
  return new Date() > this.dueDateTime;
});

// Virtual field to get time remaining until due date
WeekContentSchema.virtual('timeRemaining').get(function() {
  if (this.type !== 'homework' || !this.dueDateTime) return null;
  const now = new Date();
  const due = new Date(this.dueDateTime);
  const diff = due - now;
  
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { expired: false, days, hours, minutes, seconds };
});

// Method to check if submission is allowed
WeekContentSchema.methods.canSubmit = function() {
  if (this.type !== 'homework') return true;
  if (!this.dueDateTime) return true;
  
  const now = new Date();
  const due = new Date(this.dueDateTime);
  
  // If not overdue, allow submission
  if (now <= due) return true;
  
  // If overdue but late submission is allowed
  if (this.allowLateSubmission) return true;
  
  return false;
};

// Method to calculate late penalty
WeekContentSchema.methods.calculateLatePenalty = function(submissionDate) {
  if (this.type !== 'homework' || !this.dueDateTime || !this.allowLateSubmission) return 0;
  
  const due = new Date(this.dueDateTime);
  const submitted = new Date(submissionDate);
  
  if (submitted <= due) return 0;
  
  return this.latePenalty || 0;
};

// Index for efficient queries
WeekContentSchema.index({ week: 1, order: 1 });
WeekContentSchema.index({ type: 1 });
WeekContentSchema.index({ isActive: 1 });
WeekContentSchema.index({ dueDateTime: 1 });
WeekContentSchema.index({ type: 1, dueDateTime: 1 });

module.exports = mongoose.model('WeekContent', WeekContentSchema);
