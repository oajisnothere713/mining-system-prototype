const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deliveryLineSchema = new Schema(
  {
    material: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material is required'],
    },
    expected: {
      type: Number,
      required: [true, 'Expected quantity is required'],
    },
    received: {
      type: Number,
      required: [true, 'Received quantity is required'],
    },
  },
  { _id: true }
);

const deliverySchema = new Schema(
  {
    ibdNumber: {
      type: String,
      required: [true, 'IBD number is required'],
      unique: true,
      trim: true,
    },
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
      trim: true,
    },
    poDate: {
      type: Date,
      required: [true, 'PO date is required'],
    },
    plant: {
      type: Schema.Types.ObjectId,
      ref: 'Plant',
      required: [true, 'Plant is required'],
    },
    date: {
      type: Date,
      required: [true, 'Delivery date is required'],
    },
    supplier: {
      type: String,
      required: [true, 'Supplier is required'],
      trim: true,
    },
    state: {
      type: String,
      required: true,
      enum: {
        values: ['awaiting', 'in_transit', 'complete', 'physical_pending', 'mismatch'],
        message: '{VALUE} is not a valid delivery state',
      },
      default: 'awaiting',
    },
    materialDocumentNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    lines: [deliveryLineSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
