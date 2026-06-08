const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const customerDeliverySchema = new Schema(
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
    dayLabel: {
      type: String,
      required: [true, 'Day label is required'],
      enum: {
        values: ['Yesterday', 'Today', 'Tomorrow'],
        message: '{VALUE} is not a valid day label',
      },
    },
    bookingRef: {
      type: String,
      required: [true, 'Booking reference is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerDelivery', customerDeliverySchema);
