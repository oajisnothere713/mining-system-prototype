const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Plant code is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Plant name is required'],
      trim: true,
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plant', plantSchema);
