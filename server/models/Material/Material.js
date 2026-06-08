const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Material name is required'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Material type is required'],
      enum: {
        values: ['Bulk', 'Initiating Systems'],
        message: '{VALUE} is not a valid material type',
      },
    },
    uom: {
      type: String,
      required: [true, 'Unit of measure is required'],
      enum: {
        values: ['t', 'ea', 'm'],
        message: '{VALUE} is not a valid unit of measure',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
