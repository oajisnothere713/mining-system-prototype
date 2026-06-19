const mongoose = require('mongoose');

const fleetStatusSchema = new mongoose.Schema({
  plantCode: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('FleetStatus', fleetStatusSchema);
