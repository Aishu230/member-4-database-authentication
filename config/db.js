const mongoose = require('mongoose');

let isConnected = false;

// In production we never silently fall back to the demo database.
const memoryFallbackAllowed = () => {
  if (process.env.ALLOW_MEMORY_DB) return process.env.ALLOW_MEMORY_DB === 'true';
  return process.env.NODE_ENV !== 'production';
};

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas_collab_db';

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
    global.useMemoryDb = false;
    console.log(`[db] Connected to MongoDB (${conn.connection.host}/${conn.connection.name})`);
  } catch (error) {
    if (!memoryFallbackAllowed()) {
      console.error(`[db] Could not connect to MongoDB at ${uri}: ${error.message}`);
      process.exit(1);
    }
    console.warn(`[db] WARNING: MongoDB is not reachable at ${uri} (${error.message})`);
    console.warn('[db] Using the in-memory demo database instead. All data is lost when the server stops.');
    global.useMemoryDb = true;
    const { initMemoryStore } = require('./memoryDb');
    await initMemoryStore();
  }

  isConnected = true;
};

module.exports = connectDB;
