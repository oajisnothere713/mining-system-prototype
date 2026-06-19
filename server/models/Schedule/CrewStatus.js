const mongoose = require('mongoose');

const crewStatusSchema = new mongoose.Schema({
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

module.exports = mongoose.model('CrewStatus', crewStatusSchema);
