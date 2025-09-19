const mongoose = require('mongoose');

const RestrictionSchema = new mongoose.Schema({
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restrictedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['homework', 'notes', 'quiz', 'week', 'account'],
    required: true
  },
  scope: {
    type: String,
    enum: ['global', 'week_specific', 'material_specific'],
    default: 'global'
  },
  week: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Week'
  },
  material: {
    type: String
  },
  action: {
    type: String,
    enum: ['block', 'allow'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
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
RestrictionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
RestrictionSchema.index({ targetUser: 1, type: 1, isActive: 1 });
RestrictionSchema.index({ restrictedBy: 1 });
RestrictionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Restriction', RestrictionSchema);
