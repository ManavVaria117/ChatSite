const mongoose = require('mongoose');

const RoomSuggestionSchema = new mongoose.Schema({
  // Room details
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Creator information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Voting system
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    voteType: {
      type: String,
      enum: ['up', 'down'],
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    },
    // Add the week identifier (e.g., "2025-W41") for weekly rotation logic
    week: {
      type: String,
      index: true
    }
  }],
  
  // Vote score for sorting
  voteScore: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Optional: Room configuration if approved
  roomConfig: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    maxUsers: {
      type: Number,
      default: 100,
      min: 2,
      max: 1000
    },
    tags: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt fields
});

// Function to get the current week number
function getCurrentWeek() {
  const date = new Date();
  const oneJan = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
}

// Indexes for better query performance
RoomSuggestionSchema.index({ status: 1, voteScore: -1 });
RoomSuggestionSchema.index({ createdBy: 1 });
RoomSuggestionSchema.index({ name: 'text', description: 'text' });

// Method to update vote score for current week
RoomSuggestionSchema.methods.getCurrentWeekVotes = function() {
  const currentWeek = getCurrentWeek();
  const weeklyVotes = this.votes.filter(vote => vote.week === currentWeek);
  const upVotes = weeklyVotes.filter(vote => vote.voteType === 'up').length;
  const downVotes = weeklyVotes.filter(vote => vote.voteType === 'down').length;
  return upVotes - downVotes;
};

// Method to get votes for a specific week
RoomSuggestionSchema.methods.getVotesForWeek = function(week) {
  const weeklyVotes = this.votes.filter(vote => vote.week === week);
  const upVotes = weeklyVotes.filter(vote => vote.voteType === 'up').length;
  const downVotes = weeklyVotes.filter(vote => vote.voteType === 'down').length;
  return {
    week,
    upVotes,
    downVotes,
    score: upVotes - downVotes
  };
};

// Check if the model already exists before defining it
module.exports = mongoose.models.RoomSuggestion || 
       mongoose.model('RoomSuggestion', RoomSuggestionSchema);
