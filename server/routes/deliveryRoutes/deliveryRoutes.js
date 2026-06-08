const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  confirmPGR,
  receivePhysical,
  syncERP,
} = require('../../controllers/deliveryController/deliveryController');

// POST /api/deliveries/sync-erp — Sync ERP (must be before /:id routes)
router.post('/sync-erp', syncERP);

// GET /api/deliveries — Get all deliveries
router.get('/', getDeliveries);

// GET /api/deliveries/:id — Get single delivery
router.get('/:id', getDeliveryById);

// POST /api/deliveries — Create delivery
router.post('/', createDelivery);

// PUT /api/deliveries/:id — Update delivery
router.put('/:id', updateDelivery);

// PATCH /api/deliveries/:id/confirm-pgr — Confirm PGR
router.patch('/:id/confirm-pgr', confirmPGR);

// PATCH /api/deliveries/:id/receive-physical — Receive physical
router.patch('/:id/receive-physical', receivePhysical);

module.exports = router;
