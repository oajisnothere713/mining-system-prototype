const Booking = require('../models/Schedule/Booking');
const CrewStatus = require('../models/Schedule/CrewStatus');
const FleetStatus = require('../models/Schedule/FleetStatus');

// Physical Status Mirroring Engine
const syncBookingStatuses = async (booking, isDelete = false) => {
  if (!booking || !booking.plantCode || !booking.date) return;
  if (booking.status === "Submitted" || booking.status === "Cancelled") {
    isDelete = true;
  }
  const plantCode = booking.plantCode;
  const blastNumber = booking.blastNumber || booking._id;
  const dateKey = booking.date;
  
  const operatorIds = new Set();
  const shotfirerIds = new Set();
  const vehicleIds = new Set();
  
  (booking.deliveryDockets || []).forEach(dk => {
    if (dk.vehicleId) vehicleIds.add(dk.vehicleId);
    (dk.operatorIds || []).forEach(id => operatorIds.add(id));
    (dk.shotfirerIds || []).forEach(id => shotfirerIds.add(id));
  });
  
  const allCrew = [...operatorIds, ...shotfirerIds];
  
  if (allCrew.length > 0) {
    let crewRec = await CrewStatus.findOne({ plantCode });
    if (!crewRec) crewRec = await CrewStatus.create({ plantCode, status: {} });
    let crewChanged = false;
    
    // Ensure we clone so mongoose detects changes
    const newStatus = JSON.parse(JSON.stringify(crewRec.status || {}));
    
    allCrew.forEach(id => {
      if (!newStatus[id]) newStatus[id] = {};
      if (isDelete) {
        if (newStatus[id][dateKey] && newStatus[id][dateKey].ref === blastNumber) {
          delete newStatus[id][dateKey];
          crewChanged = true;
        }
      } else {
        newStatus[id][dateKey] = { status: "Assigned", ref: blastNumber };
        crewChanged = true;
      }
    });
    if (crewChanged) {
      crewRec.status = newStatus;
      crewRec.markModified('status');
      await crewRec.save();
    }
  }
  
  if (vehicleIds.size > 0) {
    let fleetRec = await FleetStatus.findOne({ plantCode });
    if (!fleetRec) fleetRec = await FleetStatus.create({ plantCode, status: {} });
    let fleetChanged = false;
    
    const newStatus = JSON.parse(JSON.stringify(fleetRec.status || {}));
    
    vehicleIds.forEach(id => {
      if (!newStatus[id]) newStatus[id] = {};
      if (isDelete) {
        if (newStatus[id][dateKey] && newStatus[id][dateKey].ref === blastNumber) {
          delete newStatus[id][dateKey];
          fleetChanged = true;
        }
      } else {
        newStatus[id][dateKey] = { status: "Assigned", ref: blastNumber };
        fleetChanged = true;
      }
    });
    if (fleetChanged) {
      fleetRec.status = newStatus;
      fleetRec.markModified('status');
      await fleetRec.save();
    }
  }
};

// Get all bookings (optional plant filter)
exports.getBookings = async (req, res) => {
  try {
    const { plant } = req.query;
    const filter = plant ? { plantCode: plant } : {};
    const bookings = await Booking.find(filter);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const booking = await Booking.create(req.body);
    await syncBookingStatuses(booking, false);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update an existing booking (patch or replace)
exports.updateBooking = async (req, res) => {
  try {
    const oldBooking = await Booking.findById(req.params.id);
    if (!oldBooking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Clear old statuses first
    await syncBookingStatuses(oldBooking, true);
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Apply new statuses
    await syncBookingStatuses(booking, false);
    
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    await syncBookingStatuses(booking, true);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
