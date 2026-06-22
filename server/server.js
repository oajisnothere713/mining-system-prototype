const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db/db');
const errorHandler = require('./middleware/errorHandler/errorHandler');

// Route imports
const plantRoutes = require('./routes/plantRoutes/plantRoutes');
const materialRoutes = require('./routes/materialRoutes/materialRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes/deliveryRoutes');
const stockRoutes = require('./routes/stockRoutes/stockRoutes');
const aiRoutes = require('./routes/aiRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes/scheduleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/plants', plantRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Mining System API is running', timestamp: new Date().toISOString() });
});

// Error handler (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
