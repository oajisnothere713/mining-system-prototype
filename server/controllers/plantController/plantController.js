const Plant = require('../../models/Plant/Plant');

// @desc    Get all plants
// @route   GET /api/plants
// @access  Public
const getPlants = async (req, res, next) => {
  try {
    const filter = {};
    // Default to active plants unless explicitly requested
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const plants = await Plant.find(filter).sort({ code: 1 });
    res.json({ success: true, count: plants.length, data: plants });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single plant by code
// @route   GET /api/plants/:code
// @access  Public
const getPlantByCode = async (req, res, next) => {
  try {
    const plant = await Plant.findOne({ code: req.params.code });

    if (!plant) {
      res.status(404);
      throw new Error(`Plant with code ${req.params.code} not found`);
    }

    res.json({ success: true, data: plant });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlants, getPlantByCode };
