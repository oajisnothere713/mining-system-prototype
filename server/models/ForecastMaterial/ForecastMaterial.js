const mongoose = require('mongoose');

const forecastMaterialSchema = new mongoose.Schema(
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
    weeklyDemand: {
      type: [Number],
      default: [0, 0, 0, 0],
    },
    leadTime: { type: Number, default: 7 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ForecastMaterial', forecastMaterialSchema);
