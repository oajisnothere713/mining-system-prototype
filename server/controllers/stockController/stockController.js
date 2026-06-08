const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const { calculateStockGrid, getBreakdownDetails } = require('../../utils/stockEngine/stockEngine');

// @desc    Get daily stock totals for a plant
// @route   GET /api/stock?plant=CODE&day=Today
// @access  Public
const getStock = async (req, res, next) => {
  try {
    const { plant: plantCode, day } = req.query;

    if (!plantCode) {
      res.status(400);
      throw new Error('Plant code is required (e.g., ?plant=2025)');
    }

    const plant = await Plant.findOne({ code: plantCode });
    if (!plant) {
      res.status(404);
      throw new Error(`Plant with code ${plantCode} not found`);
    }

    const stockGrid = await calculateStockGrid(plantCode);

    // If day is specified, filter to just that day
    if (day) {
      const validDays = ['Yesterday', 'Today', 'Tomorrow'];
      if (!validDays.includes(day)) {
        res.status(400);
        throw new Error(`Invalid day parameter. Must be one of: ${validDays.join(', ')}`);
      }

      const dayData = [];
      for (const [materialName, days] of Object.entries(stockGrid)) {
        if (days[day]) {
          dayData.push(days[day]);
        }
      }

      return res.json({
        success: true,
        data: dayData,
      });
    }

    res.json({
      success: true,
      data: stockGrid,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get breakdown details for a specific stock cell
// @route   GET /api/stock/breakdown?plant=CODE&material=NAME&column=pgrC&day=Today
// @access  Public
const getBreakdown = async (req, res, next) => {
  try {
    const { plant: plantCode, material: materialName, column, day } = req.query;

    if (!plantCode || !materialName || !column || !day) {
      res.status(400);
      throw new Error('Required query params: plant, material, column, day');
    }

    const plant = await Plant.findOne({ code: plantCode });
    if (!plant) {
      res.status(404);
      throw new Error(`Plant with code ${plantCode} not found`);
    }

    const material = await Material.findOne({ name: materialName });
    if (!material) {
      res.status(404);
      throw new Error(`Material "${materialName}" not found`);
    }

    const breakdown = await getBreakdownDetails(plantCode, materialName, column, day);

    res.json({
      success: true,
      data: {
        plant: { code: plant.code, name: plant.name },
        material: { name: material.name, type: material.type, uom: material.uom },
        column,
        day,
        breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger full stock recalculation
// @route   POST /api/stock/recalculate
// @access  Public
const recalculateStock = async (req, res, next) => {
  try {
    const plants = await Plant.find({ isActive: true });
    const results = {};

    for (const plant of plants) {
      results[plant.code] = await calculateStockGrid(plant.code);
    }

    res.json({
      success: true,
      message: `Recalculated stock for ${plants.length} plants`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStock, getBreakdown, recalculateStock };
