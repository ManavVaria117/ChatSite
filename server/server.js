const express = require('express');
const connectDB = require('./config/db');
const User = require('./models/User'); // <-- Ensure User model is imported

const authRoutes = require('./routes/auth');
const cors = require('cors'); // Import cors
const userRoutes = require('./routes/users');
const path = require('path');
const Message = require('./models/Message'); // <-- Ensure Message model is imported

const messageRoutes = require('./routes/messages'); // Import the new messages route
const chatRoutes = require('./routes/chat'); // Import the new chat route - REMOVED
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
                profilePic: senderUser.profilePic,
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