const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('../models/Room');
const Message = require('../models/Message');

dotenv.config();

const migrate = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create a default room if it doesn't exist
    let defaultRoom = await Room.findOne({ name: 'general' });
    if (!defaultRoom) {
      console.log('Creating default general room...');
      defaultRoom = new Room({
        name: 'general',
        description: 'General chat room',
        createdBy: new mongoose.Types.ObjectId(), // System user
        isTemporary: false
      });
      await defaultRoom.save();
    }

    console.log('Updating message room references...');
    
    // Update all messages to reference the default room
    const result = await Message.updateMany(
      { room: { $type: 'string' } }, // Only update string room references
      { $set: { room: defaultRoom._id } }
    );

    console.log(`Migration complete. Updated ${result.nModified} messages.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
