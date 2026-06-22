const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  materialId: { type: String, required: true },
  name: { type: String },
  category: { type: String },
  plannedQty: { type: Number, required: true },
  uom: { type: String },
  actualQty: { type: Number, default: null }
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  serviceId: { type: String, required: true },
  name: { type: String },
  qty: { type: Number, default: 1 },
  uom: { type: String }
}, { _id: false });

const deliveryDocketSchema = new mongoose.Schema({
  docketNumber: { type: String, required: true },
  status: { type: String, default: "Planned" },
  vehicleId: { type: String },
  operatorIds: [{ type: String }],
  shotfirerIds: [{ type: String }],
  products: [productSchema],
  services: [serviceSchema],
  notes: { type: String, default: "" },
  signature: { type: String, default: null }
}, { _id: false });

const recurrenceSchema = new mongoose.Schema({
  frequency: { type: String }, // 'daily' or 'weekly'
  endDate: { type: String },
  workingDaysOnly: { type: Boolean, default: false },
  occurrences: { type: Number }
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Using blastNumber/BL-XXXX as ID to match frontend
    blastNumber: { type: String, required: true, unique: true },
    plantCode: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String },
    bookingType: { 
      type: String, 
      enum: ['single', 'multi', 'recurring'],
      default: 'single'
    },
    endDate: { type: String, default: null },
    recurrence: { type: recurrenceSchema, default: null },
    customerId: { type: String },
    customerName: { type: String },
    shipToSite: { type: String },
    customerPO: { type: String },
    contractId: { type: String },
    deliveryDockets: [deliveryDocketSchema],
    status: { type: String, default: "Planned" }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
