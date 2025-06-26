const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Reference to the User model (lowercase 'user')
    required: true,
  },
  room: {
    type: String, // Or mongoose.Schema.Types.ObjectId if you have a Room model
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Sentiment analysis of the message
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  // Reactions to the message
  reactions: [
    {
      emoji: {
        type: String, // e.g., '👍', '❤️', '😂', '😢', '🙏'
        required: true,
      },
      // Store user reactions
      users: [ // Array of user IDs who added this reaction
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'user', // Reference to the User model (lowercase 'user')
        }
      ]
      // --- End Keep ---
    }
  ]
});

// Update room's last activity when a new message is saved
MessageSchema.post('save', async function(doc) {
  try {
    const Room = mongoose.model('Room');
    await Room.findByIdAndUpdate(doc.room, { 
      lastActivity: new Date(),
      $inc: { messageCount: 1 }
    });
  } catch (error) {
    console.error('Error updating room activity:', error);
  }
});

// Check if the model already exists before defining it
module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);