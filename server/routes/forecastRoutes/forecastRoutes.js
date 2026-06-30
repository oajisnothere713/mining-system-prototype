const express = require('express');
const router = express.Router();
const forecastController = require('../../controllers/forecastController/forecastController');

router.post('/seed', forecastController.seedForecastData);
router.get('/materials', forecastController.getMaterials);
router.put('/materials/:id', forecastController.updateMaterial);

router.get('/plans', forecastController.getPlan);
router.patch('/plans/:id/status', forecastController.updatePlanStatus);

router.get('/capacity', forecastController.getCapacity);
router.get('/accuracy', forecastController.getAccuracy);

module.exports = router;
