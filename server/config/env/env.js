const path = require('path');
const dotenv = require('dotenv');

const loadEnv = () => {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

  const requiredVars = ['MONGO_URI'];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missing.join(', ')}. Using defaults.`
    );
  }

  return {
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/mining-system',
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
};

module.exports = loadEnv;
