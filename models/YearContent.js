const mongoose = require('mongoose');

const YearContentSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true,
    unique: true,
    enum: ['Year 8', 'Year 9', 'Year 10']
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
  icon: {
    type: String,
    required: true,
    default: 'fas fa-calculator'
  },
  features: [{
    type: String,
    trim: true
  }],
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
  learningObjectives: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }],
  topics: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner'
    },
    estimatedHours: {
      type: Number,
      min: 1,
      max: 50
    }
  }],
  prerequisites: [{
    type: String,
    trim: true
  }],
  assessmentTypes: [{
    type: {
      type: String,
      enum: ['Quiz', 'Assignment', 'Project', 'Exam', 'Presentation'],
      required: true
    },
    weight: {
      type: Number,
      min: 0,
      max: 100
    },
    description: {
      type: String
    }
  }],
  resources: [{
    type: {
      type: String,
      enum: ['Textbook', 'Video', 'Interactive', 'Worksheet', 'Simulation'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    url: {
      type: String
    }
  }],
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
YearContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
YearContentSchema.index({ year: 1, curriculum: 1, studentType: 1 });
YearContentSchema.index({ isActive: 1 });

module.exports = mongoose.model('YearContent', YearContentSchema);
