const mongoose = require('mongoose');

const forecastAccuracySchema = new mongoose.Schema(
  {
    plant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plant',
      required: true,
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
    },
    accuracy: {
      type: Number,
      required: true,
    },
    weekOffset: {
      type: Number,
      default: -1, // e.g. -1 for last week, -2 for two weeks ago
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForecastAccuracy', forecastAccuracySchema);
