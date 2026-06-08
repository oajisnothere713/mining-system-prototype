const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stockSchema = new Schema(
  {
    plant: {
      type: Schema.Types.ObjectId,
      ref: 'Plant',
      required: [true, 'Plant is required'],
    },
    material: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    opening: {
      type: Number,
      required: [true, 'Opening quantity is required'],
    },
    inboundComplete: {
      type: Number,
      default: 0,
    },
    inboundPending: {
      type: Number,
      default: 0,
    },
    customerDelivery: {
      type: Number,
      default: 0,
    },
    closing: {
      type: Number,
      required: [true, 'Closing quantity is required'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
    },
  },
  { timestamps: true }
);

stockSchema.index({ plant: 1, material: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
