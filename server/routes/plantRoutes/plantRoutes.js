const express = require('express');
const router = express.Router();
const { getPlants, getPlantByCode } = require('../../controllers/plantController/plantController');

// GET /api/plants — Get all plants
router.get('/', getPlants);

// GET /api/plants/:code — Get single plant by code
router.get('/:code', getPlantByCode);

module.exports = router;
