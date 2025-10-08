const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Reference to the User model (lowercase 'user')
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
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
  // Add the reactions field
  reactions: [
    {
      emoji: {
        type: String, // e.g., '👍', '❤️', '😂', '😢', '🙏'
        required: true,
      },
      // --- Keep the users array to store who reacted for counting ---
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