const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  isTemporary: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for finding expired rooms
RoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update last activity and increment message count
RoomSchema.methods.updateActivity = async function() {
  this.lastActivity = new Date();
  this.messageCount += 1;
  await this.save();
};

// Check if room is active (has recent activity)
RoomSchema.methods.isActive = function() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return this.lastActivity > twoWeeksAgo;
};

// Check if room is expiring soon (within 3 days)
RoomSchema.methods.isExpiringSoon = function() {
  if (!this.expiresAt) return false;
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return this.expiresAt <= threeDaysFromNow;
};

// Static method to get active rooms
RoomSchema.statics.getActiveRooms = function() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  return this.find({
    $or: [
      { isTemporary: false },
      { lastActivity: { $gte: twoWeeksAgo } }
    ]
  }).sort({ lastActivity: -1 });
};

// Static method to get least active room
RoomSchema.statics.getLeastActiveRoom = async function() {
  return this.findOne()
    .sort({ messageCount: 1, lastActivity: 1 })
    .exec();
};

// Check if the model already exists before defining it
module.exports = mongoose.models.Room || mongoose.model('Room', RoomSchema);
