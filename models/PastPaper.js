const mongoose = require('mongoose');

const PastPaperSchema = new mongoose.Schema({
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
    enum: ['School', 'Center', 'Online', 'ALL']
  },
  paperType: {
    type: String,
    required: true,
    enum: [
      'Paper 1', 'Paper 2', 'Paper 3', 'Paper 4',
      'Paper 1H', 'Paper 2H',
      'Unit One', 'Unit Two',

    ]
  },
  examYear: {
    type: Number,
    required: true,
    min: 2020,
    max: new Date().getFullYear()
  },
  duration: {
    type: Number,
    required: true,
    min: 30,
    max: 180
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 50,
    max: 200
  },
  calculatorAllowed: {
    type: Boolean,
    default: false
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  topics: [{
    type: String,
    trim: true
  }],
  // Main paper file
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: 'pdf'
  },
  fileSize: {
    type: Number
  },
  cloudinaryPublicId: {
    type: String
  },
  
  // Answer key file
  answerKeyUrl: {
    type: String
  },
  answerKeyFileName: {
    type: String
  },
  answerKeyFileType: {
    type: String,
    default: 'pdf'
  },
  answerKeyFileSize: {
    type: Number
  },
  answerKeyCloudinaryPublicId: {
    type: String
  },
  
  // Marking scheme file
  markingSchemeUrl: {
    type: String
  },
  markingSchemeFileName: {
    type: String
  },
  markingSchemeFileType: {
    type: String,
    default: 'pdf'
  },
  markingSchemeFileSize: {
    type: Number
  },
  markingSchemeCloudinaryPublicId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Access control
  accessControl: {
    isPublic: {
      type: Boolean,
      default: true
    },
    restrictedStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'private'],
      default: 'public'
    }
  },
  
  // Preview settings
  allowPreview: {
    type: Boolean,
    default: true
  },
  previewPages: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 0
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
PastPaperSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
PastPaperSchema.index({ year: 1, curriculum: 1, studentType: 1 });
PastPaperSchema.index({ paperType: 1 });
PastPaperSchema.index({ examYear: 1 });
PastPaperSchema.index({ isActive: 1 });
PastPaperSchema.index({ difficulty: 1 });

module.exports = mongoose.model('PastPaper', PastPaperSchema);
