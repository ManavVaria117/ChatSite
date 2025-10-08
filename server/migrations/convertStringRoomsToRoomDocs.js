const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('../models/Room');
const Message = require('../models/Message');

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Connected to MongoDB');

  // 1) Discover distinct string room identifiers from legacy messages
  const stringRooms = await Message.distinct('room', { room: { $type: 'string' } });
  console.log('Found string rooms:', stringRooms);

  // 2) Map legacy string -> Room document
  const map = new Map();
  for (const name of stringRooms) {
    const isPrebuilt = ['general-chat', 'sports', 'technology', 'random'].includes(name);
    const description = isPrebuilt
      ? ({
          'general-chat': 'General Chat',
          'sports': 'Sports Talk',
          'technology': 'Tech Discussion',
          'random': 'Random Chat',
        }[name])
      : 'Migrated legacy room';

    let room = await Room.findOne({ name });
    if (!room) {
      room = new Room({
        name,
        description,
        createdBy: new mongoose.Types.ObjectId(),
        isTemporary: false,
      });
      await room.save();
      console.log('Created Room:', name, room._id.toString());
    }
    map.set(name, room._id);
  }

  // 3) Bulk update messages to point to Room ObjectIds
  for (const [legacyName, roomId] of map.entries()) {
    const res = await Message.updateMany(
      { room: legacyName },
      { $set: { room: roomId } }
    );
    console.log(`Updated messages for room '${legacyName}':`, res.modifiedCount || res.nModified || 0);
  }

  console.log('Migration complete.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

