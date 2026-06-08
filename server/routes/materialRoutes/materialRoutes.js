const express = require('express');
const router = express.Router();
const { getMaterials } = require('../../controllers/materialController/materialController');

// GET /api/materials — Get all materials
router.get('/', getMaterials);

module.exports = router;
