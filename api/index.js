const path = require('path');

// On Vercel, env vars come from the dashboard — no .env file needed
if (!process.env.VERCEL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes from the server directory
const plantRoutes = require('../server/routes/plantRoutes/plantRoutes');
const materialRoutes = require('../server/routes/materialRoutes/materialRoutes');
const deliveryRoutes = require('../server/routes/deliveryRoutes/deliveryRoutes');
const stockRoutes = require('../server/routes/stockRoutes/stockRoutes');
const aiRoutes = require('../server/routes/aiRoutes');
const scheduleRoutes = require('../server/routes/scheduleRoutes/scheduleRoutes');
const bookingRoutes = require('../server/routes/bookingRoutes');
const forecastRoutes = require('../server/routes/forecastRoutes/forecastRoutes');
const errorHandler = require('../server/middleware/errorHandler/errorHandler');

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── MongoDB connection caching for serverless ──────────────────
// Serverless functions are stateless — we cache the connection
// across warm invocations to avoid reconnecting every request.
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  const conn = await mongoose.connect(MONGO_URI);
  cachedConnection = conn;
  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
};

// Connect to DB before handling any request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/plants', plantRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/forecast', forecastRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mining System API is running on Vercel',
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler (must be after routes) ───────────────────────
app.use(errorHandler);

module.exports = app;
