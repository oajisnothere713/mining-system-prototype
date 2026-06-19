const express = require('express');
const router = express.Router();
const {
  getCrewStatus,
  updateCrewStatus,
  getFleetStatus,
  updateFleetStatus
} = require('../../controllers/scheduleController/scheduleController');

router.get('/crew/:plantCode', getCrewStatus);
router.put('/crew/:plantCode', updateCrewStatus);

router.get('/fleet/:plantCode', getFleetStatus);
router.put('/fleet/:plantCode', updateFleetStatus);

module.exports = router;
