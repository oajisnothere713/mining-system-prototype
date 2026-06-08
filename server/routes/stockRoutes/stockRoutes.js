const express = require('express');
const router = express.Router();
const {
  getStock,
  getBreakdown,
  recalculateStock,
} = require('../../controllers/stockController/stockController');

// GET /api/stock — Get daily stock totals
router.get('/', getStock);

// GET /api/stock/breakdown — Get breakdown details for a cell
router.get('/breakdown', getBreakdown);

// POST /api/stock/recalculate — Trigger full recalculation
router.post('/recalculate', recalculateStock);

module.exports = router;
