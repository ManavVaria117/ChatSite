const express = require('express');
const connectDB = require('./config/db');
const User = require('./models/User'); // <-- Ensure User model is imported

const authRoutes = require('./routes/auth');
const cors = require('cors'); // Import cors
const userRoutes = require('./routes/users');
const path = require('path');
const Message = require('./models/Message'); // <-- Ensure Message model is imported

const messageRoutes = require('./routes/messages'); // Import the new messages route
// const chatRoutes = require('./routes/chat'); // Import the new chat route - REMOVED
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Import jwt
require('dotenv').config(); // Ensure dotenv is loaded



const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Connect Database
connectDB(); // connectDB function handles connection internally

// Init Middleware
// Add this line to enable CORS for your Express app
app.use(cors());

// Bodyparser Middleware (if you're using express.json() or express.urlencoded())
// Assuming you are using express.json() for parsing JSON request bodies
app.use(express.json({ extended: false }));

// Define Routes
// Ensure User model is imported before these routes are used
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
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
    socket.join(roomId);
    console.log(`Socket ${socket.id} (User ${socket.userId}) joined room ${roomId}`);
  });

  // Handle receiving a message from the client via socket
  socket.on('sendMessage', async ({ roomId, content }) => {
    console.log(`Message received via socket in room ${roomId} from User ${socket.userId}: ${content}`);

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
            sender: {
                _id: senderUser._id,
                username: senderUser.username,
                // profilePic: senderUser.profilePic,
            },
            room: newMessage.room,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
        };


        // Broadcast the message to the room
        io.to(roomId).emit('receiveMessage', messageToSend);
        console.log(`Message broadcast to room ${roomId}`);

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
        // userId is now received directly from the client
        // const userId = socket.userId; // No longer need to get from socket.userId if client sends it

        if (!userId) {
            console.error('User ID not provided for toggling reaction');
            socket.emit('reactionError', 'User ID required to add reactions.');
            return;
        }

        const message = await Message.findById(messageId);

        if (!message) {
            console.error(`Message not found with ID: ${messageId}`);
            socket.emit('reactionError', 'Message not found.');
            return;
        }

        // Find if this emoji reaction already exists on the message
        let reaction = message.reactions.find(r => r.emoji === emoji);

        if (reaction) {
            // Reaction exists, check if user has already reacted with this emoji
            // Convert userId to string for comparison if needed, depending on how it's stored
            const userIdStr = userId.toString();
            const userIndex = reaction.users.findIndex(id => id.toString() === userIdStr);

            if (userIndex > -1) {
                // User has reacted, remove their reaction
                reaction.users.splice(userIndex, 1);
                console.log(`Removed reaction ${emoji} from message ${messageId} for user ${userId}`);

                // If no users left for this reaction, remove the reaction object
                if (reaction.users.length === 0) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                    console.log(`Removed empty reaction object ${emoji} from message ${messageId}`);
                }

            } else {
                // User has not reacted, add their reaction
                reaction.users.push(userId);
                console.log(`Added reaction ${emoji} to message ${messageId} for user ${userId}`);
            }
        } else {
            // Reaction does not exist, create a new one
            message.reactions.push({ emoji: emoji, users: [userId] });
            console.log(`Created new reaction ${emoji} on message ${messageId} for user ${userId}`);
        }

        // Save the updated message
        await message.save();
        console.log(`Message ${messageId} saved after reaction toggle.`);

        // --- Fetch the message again and populate sender and reactions.users before emitting ---
        // This is crucial to send the full, updated message object to the client
        const populatedMessage = await Message.findById(messageId)
            .populate('sender', 'username profilePic') // Populate sender details
            .populate({ // Populate users within reactions
              path: 'reactions.users',
              select: 'username' // Select username if needed on client, though we removed displaying the list
            });
        // --- End Fetch and Populate ---

        // Emit the populated message to the room
        // The client's 'updateMessage' listener will receive this
        io.to(message.room).emit('updateMessage', populatedMessage);
        console.log(`Emitted updateMessage for message ${messageId} to room ${message.room}`);

    } catch (error) {
        console.error('Error toggling reaction:', error);
        // Log the full error stack for debugging
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