const CrewStatus = require('../../models/Schedule/CrewStatus');
const FleetStatus = require('../../models/Schedule/FleetStatus');

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
      record.status = status;
      await record.save();
    } else {
      record = await CrewStatus.create({ plantCode, status });
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
      record.status = status;
      await record.save();
    } else {
      record = await FleetStatus.create({ plantCode, status });
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
