const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mining-system';
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(MONGO_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      break;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries}/${MAX_RETRIES} failed: ${error.message}`);
      if (retries === MAX_RETRIES) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, retries * 2000));
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully.');
  });
};

module.exports = connectDB;
