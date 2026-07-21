const Material = require('../../models/Material/Material');

// @desc    Get all materials
// @route   GET /api/materials
// @access  Public
const getMaterials = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const materials = await Material.find(filter).sort({ type: 1, name: 1 });
    res.json({ success: true, count: materials.length, data: materials });
  } catch (error) {
    next(error);
  }
};
module.exports = { getMaterials };
