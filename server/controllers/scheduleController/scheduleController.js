const CrewStatus = require('../../models/Schedule/CrewStatus');
const FleetStatus = require('../../models/Schedule/FleetStatus');

// Helper to preserve any "Assigned" statuses injected by the Booking engine
const preserveAssigned = (oldStatus, newStatus) => {
  const merged = JSON.parse(JSON.stringify(newStatus || {}));
  if (oldStatus) {
    for (const [entityId, dates] of Object.entries(oldStatus)) {
      if (typeof dates === 'object') {
        for (const [date, val] of Object.entries(dates)) {
          if (val && val.status === 'Assigned') {
            if (!merged[entityId]) merged[entityId] = {};
            merged[entityId][date] = val;
          }
        }
      }
    }
  }
  return merged;
};

// @desc    Get crew status for a plant
// @route   GET /api/schedule/crew/:plantCode
// @access  Public
const getCrewStatus = async (req, res, next) => {
  try {
    const { plantCode } = req.params;
    let record = await CrewStatus.findOne({ plantCode });
    if (!record) {
      // Create default if it doesn't exist
      record = await CrewStatus.create({ plantCode, status: {} });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Update crew status for a plant
// @route   PUT /api/schedule/crew/:plantCode
// @access  Public
const updateCrewStatus = async (req, res, next) => {
  try {
    const { plantCode } = req.params;
    const { status } = req.body;
    let record = await CrewStatus.findOne({ plantCode });
    
    if (record) {
      record.status = preserveAssigned(record.status, status);
      record.markModified('status');
      await record.save();
    } else {
      record = await CrewStatus.create({ plantCode, status: preserveAssigned({}, status) });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Get fleet status for a plant
// @route   GET /api/schedule/fleet/:plantCode
// @access  Public
const getFleetStatus = async (req, res, next) => {
  try {
    const { plantCode } = req.params;
    let record = await FleetStatus.findOne({ plantCode });
    if (!record) {
      record = await FleetStatus.create({ plantCode, status: {} });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Update fleet status for a plant
// @route   PUT /api/schedule/fleet/:plantCode
// @access  Public
const updateFleetStatus = async (req, res, next) => {
  try {
    const { plantCode } = req.params;
    const { status } = req.body;
    let record = await FleetStatus.findOne({ plantCode });
    
    if (record) {
      record.status = preserveAssigned(record.status, status);
      record.markModified('status');
      await record.save();
    } else {
      record = await FleetStatus.create({ plantCode, status: preserveAssigned({}, status) });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCrewStatus,
  updateCrewStatus,
  getFleetStatus,
  updateFleetStatus
};
