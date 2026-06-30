const mongoose = require('mongoose');

const forecastPlanSchema = new mongoose.Schema(
  {
    plant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plant',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'review', 'created'],
      default: 'draft',
    },
    confidence: {
      type: Number,
      default: 85,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForecastPlan', forecastPlanSchema);
