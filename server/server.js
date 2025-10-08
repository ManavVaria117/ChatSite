const express = require('express');
const connectDB = require('./config/db');
const User = require('./models/User'); // <-- Ensure User model is imported

const authRoutes = require('./routes/auth');
const cors = require('cors'); // Import cors
const userRoutes = require('./routes/users');
const path = require('path');
const Message = require('./models/Message'); // <-- Ensure Message model is imported

const messageRoutes = require('./routes/messages'); // Import the messages route
const suggestionRoutes = require('./routes/suggestions'); // Import the suggestions route
const roomStatusRoutes = require('./routes/roomStatus'); // Import room status route
const roomRoutes = require('./routes/rooms');
// const chatRoutes = require('./routes/chat'); // Import the new chat route - REMOVED
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Import jwt
require('dotenv').config(); // Ensure dotenv is loaded

// Initialize room rotation service
const roomRotationService = require('./services/roomRotationService');
console.log('Room rotation service initialized');



const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Connect Database
connectDB(); // connectDB function handles connection internally

// Init Middleware
// Add this line to enable CORS for your Express app
app.use(cors());

// Body parsing
app.use(express.json());

// Define Routes
// Ensure User model is imported before these routes are used
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/suggestions', suggestionRoutes); // Mount the suggestions routes
app.use('/api/room-status', roomStatusRoutes); // Mount the room status routes
app.use('/api/rooms', roomRoutes);
// app.use('/api/chat/:roomId', chatRoutes); // Mount the new chat routes - REMOVED

// Add Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err.message); // Log the JWT error
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.userId = decoded.user.id; // Attach user ID to the socket
    next();
  });
});


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'User ID:', socket.userId);

  // Handle joining a room
  socket.on('joinRoom', (roomId) => {
    if (!roomId) {
      console.warn(`Socket ${socket.id} (User ${socket.userId}) attempted to join a null or empty room ID.`);
      // Optionally emit an error back to the client
      socket.emit('roomError', 'Invalid room ID provided.');
      return;
    }
    
    // Leave any existing rooms
    const rooms = Array.from(socket.rooms || []);
    rooms.forEach(room => {
      if (room !== socket.id) { // Don't leave the default room (socket's own room)
        socket.leave(room);
      }
    });
    
    // Join the new room
    socket.join(roomId);
    console.log(`Socket ${socket.id} (User ${socket.userId}) joined room ${roomId}`);
  });
  
  // Handle typing indicators
  socket.on('typing', async (roomId) => {
    console.log(`User ${socket.userId} is typing in room ${roomId}`);
    if (!roomId) {
      console.warn('Received typing event without roomId');
      return;
    }
    
    try {
      // Get the user's username
      const user = await User.findById(socket.userId).select('username');
      if (!user) {
        console.warn(`User ${socket.userId} not found`);
        return;
      }
      
      // Broadcast to everyone in the room except the sender
      socket.to(roomId).emit('typing', {
        roomId,
        userId: socket.userId,
        username: user.username
      });
    } catch (err) {
      console.error('Error handling typing event:', err);
    }
  });

  socket.on('stop typing', async (roomId) => {
    console.log(`User ${socket.userId} stopped typing in room ${roomId}`);
    if (!roomId) {
      console.warn('Received stop typing event without roomId');
      return;
    }
    
    try {
      // Get the user's username
      const user = await User.findById(socket.userId).select('username');
      if (!user) {
        console.warn(`User ${socket.userId} not found`);
        return;
      }
      
      // Broadcast to everyone in the room except the sender
      socket.to(roomId).emit('stop typing', {
        roomId,
        userId: socket.userId,
        username: user.username
      });
    } catch (err) {
      console.error('Error handling stop typing event:', err);
    }
  });

  // Handle receiving a message from the client via socket
  socket.on('sendMessage', async ({ roomId, content, tempId }) => {
    console.log(`Message received via socket in room ${roomId} from User ${socket.userId} (tempId: ${tempId}): ${content}`);

    const senderId = socket.userId; // User ID is available from authenticated socket

    if (!senderId) {
        console.error('Cannot send message: User not authenticated via socket (senderId missing)');
        socket.emit('messageError', 'Authentication required to send messages.');
        return;
    }
    if (!roomId) {
        console.error('Cannot send message: Room ID is missing.');
        socket.emit('messageError', 'Room ID is missing.');
        return;
    }
    if (!content || !content.trim()) {
        console.error('Cannot send message: Message content is empty.');
        socket.emit('messageError', 'Message content cannot be empty.');
        return;
    }


    try {
        // Find the sender user to get their username and profile pic for the message object
        // User model should be accessible here now
        const senderUser = await User.findById(senderId).select('username profilePic');
        if (!senderUser) {
            console.error('Sender user not found for ID:', senderId);
            socket.emit('messageError', 'Sender user not found.');
            return;
        }

        // Create a new message instance
        const newMessage = new Message({ // <-- Message model also needs to be imported
            sender: senderId,
            room: roomId,
            content: content,
        });

        // Save the message to the database
        await newMessage.save();

        // Prepare the message object to send back to clients (include sender details)
        const messageToSend = {
            _id: newMessage._id,
            tempId: tempId, // Include the tempId to match with the optimistic update
            sender: {
                _id: senderUser._id,
                username: senderUser.username,
                // profilePic: senderUser.profilePic,
            },
            room: newMessage.room,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            isOptimistic: false // Mark as not an optimistic update
        };

        // Broadcast the message to the room
        io.to(roomId).emit('receiveMessage', messageToSend);
        console.log(`Message broadcast to room ${roomId} with tempId: ${tempId}`);

    } catch (err) {
        console.error('Error saving or broadcasting message:', err.message);
        // Log the full error stack for debugging
        console.error(err.stack);
        socket.emit('messageError', 'Failed to send message.');
    }
  });

  // --- Handle toggleReaction event ---
  // Ensure userId is destructured from the event data
  socket.on('toggleReaction', async ({ messageId, emoji, userId }) => {
    try {
      if (!userId) {
        console.error('User ID not provided for toggling reaction');
        socket.emit('reactionError', 'User ID required to add reactions.');
        return;
      }

      console.log(`Toggling reaction - Message: ${messageId}, Emoji: ${emoji}, User: ${userId}`);

      // Find the message
      const message = await Message.findById(messageId);
      if (!message) {
        console.error(`Message not found with ID: ${messageId}`);
        socket.emit('reactionError', 'Message not found.');
        return;
      }

      // Initialize reactions array if it doesn't exist
      if (!message.reactions) {
        message.reactions = [];
      }

      // Find the reaction for this emoji
      let reaction = message.reactions.find(r => r.emoji === emoji);
      let reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

      // Check if user has already reacted with this emoji
      let userReacted = false;
      if (reaction) {
        // Check if user is in the reaction's users array
        userReacted = reaction.users.some(u => 
          u && (u.toString() === userId.toString() || (u._id && u._id.toString() === userId.toString()))
        );

        if (userReacted) {
          // Remove user from reaction
          reaction.users = reaction.users.filter(u => 
            u && (u.toString() !== userId.toString() && (!u._id || u._id.toString() !== userId.toString()))
          );
          
          // Remove reaction if no users left
          if (reaction.users.length === 0) {
            message.reactions.splice(reactionIndex, 1);
          }
        } else {
          // Add user to reaction
          reaction.users.push(userId);
        }
      } else {
        // Create new reaction
        message.reactions.push({
          emoji,
          users: [userId]
        });
      }

      // Save the updated message
      await message.save();
      console.log('Updated message:', message);

      // Populate the message with user details
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username profilePic')
        .populate({
          path: 'reactions.users',
          select: 'username'
        });

      // Emit the updated message to the room
      io.to(message.room).emit('updateMessage', populatedMessage);
      console.log(`Emitted updateMessage for message ${messageId} to room ${message.room}`);

    } catch (error) {
        console.error('Error toggling reaction:', error);
        console.error(error.stack);
        socket.emit('reactionError', 'Failed to toggle reaction.');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id, 'User ID:', socket.userId);
  });
});


// Add the root route definition here, after all other specific routes
app.use('/', (req, res) => {
  res.send('API Running');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));