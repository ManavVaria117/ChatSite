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

// Indexes for better query performance
RoomSuggestionSchema.index({ status: 1, voteScore: -1 });
RoomSuggestionSchema.index({ createdBy: 1 });
RoomSuggestionSchema.index({ name: 'text', description: 'text' });

// Method to update vote score
RoomSuggestionSchema.methods.updateVoteScore = function() {
  this.voteScore = this.votes.reduce((score, vote) => {
    return vote.voteType === 'up' ? score + 1 : score - 1;
  }, 0);
  return this.save();
};

// Check if the model already exists before defining it
module.exports = mongoose.models.RoomSuggestion || 
       mongoose.model('RoomSuggestion', RoomSuggestionSchema);
