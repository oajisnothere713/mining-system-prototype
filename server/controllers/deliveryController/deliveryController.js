const mongoose = require('mongoose');
const Delivery = require('../../models/Delivery/Delivery');
const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const Stock = require('../../models/Stock/Stock');

// Helper to format delivery for frontend
const formatDelivery = (d) => {
  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return {
    _id: d._id,
    id: d.ibdNumber,
    po: d.poNumber,
    poDate: formatDate(d.poDate),
    plant: d.plant ? (typeof d.plant === 'object' && d.plant.code ? d.plant.code : d.plant.toString()) : '',
    date: formatDate(d.date),
    supplier: d.supplier,
    state: d.state,
    lines: d.lines.map(line => ({
      _id: line._id,
      material: line.material ? (typeof line.material === 'object' && line.material.name ? line.material.name : line.material.toString()) : '',
      expected: line.expected,
      received: line.received
    }))
  };
};

const findDeliveryByIdOrNumber = async (idOrNumber) => {
  const query = mongoose.Types.ObjectId.isValid(idOrNumber)
    ? { _id: idOrNumber }
    : { ibdNumber: idOrNumber };
  return await Delivery.findOne(query);
};

const findDeliveryByIdOrNumberPopulated = async (idOrNumber) => {
  const query = mongoose.Types.ObjectId.isValid(idOrNumber)
    ? { _id: idOrNumber }
    : { ibdNumber: idOrNumber };
  return await Delivery.findOne(query)
    .populate('plant', 'code name')
    .populate('lines.material');
};

// @desc    Get all deliveries
// @route   GET /api/deliveries
// @access  Public
const getDeliveries = async (req, res, next) => {
  try {
    const filter = {};

    // Filter by plant code — look up Plant by code first
    if (req.query.plant) {
      const plant = await Plant.findOne({ code: req.query.plant });
      if (!plant) {
        res.status(404);
        throw new Error(`Plant with code ${req.query.plant} not found`);
      }
      filter.plant = plant._id;
    }

    // Filter by state
    if (req.query.status) {
      filter.state = req.query.status;
    }

    const deliveries = await Delivery.find(filter)
      .populate('plant', 'code name')
      .populate('lines.material')
      .sort({ date: -1, ibdNumber: -1 });

    const formatted = deliveries.map(formatDelivery);
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single delivery by ID
// @route   GET /api/deliveries/:id
// @access  Public
const getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await findDeliveryByIdOrNumberPopulated(req.params.id);

    if (!delivery) {
      res.status(404);
      throw new Error('Delivery not found');
    }

    res.json({ success: true, data: formatDelivery(delivery) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new delivery
// @route   POST /api/deliveries
// @access  Public
const createDelivery = async (req, res, next) => {
  try {
    const { ibdNumber, poNumber, poDate, plant: plantCode, date, supplier, state, lines } = req.body;

    // Look up Plant by code
    const plant = await Plant.findOne({ code: plantCode });
    if (!plant) {
      res.status(400);
      throw new Error(`Plant with code ${plantCode} not found`);
    }

    // Look up Materials by name and build lines
    const resolvedLines = [];
    for (const line of lines) {
      const material = await Material.findOne({ name: line.material });
      if (!material) {
        res.status(400);
        throw new Error(`Material "${line.material}" not found`);
      }
      resolvedLines.push({
        material: material._id,
        expected: line.expected,
        received: line.received,
      });
    }

    const delivery = await Delivery.create({
      ibdNumber,
      poNumber,
      poDate: new Date(poDate),
      plant: plant._id,
      date: new Date(date),
      supplier,
      state: state || 'awaiting',
      lines: resolvedLines,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('plant', 'code name')
      .populate('lines.material');

    res.status(201).json({ success: true, data: formatDelivery(populated) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery
// @route   PUT /api/deliveries/:id
// @access  Public
const updateDelivery = async (req, res, next) => {
  try {
    const delivery = await findDeliveryByIdOrNumber(req.params.id);

    if (!delivery) {
      res.status(404);
      throw new Error('Delivery not found');
    }

    const { plant: plantCode, lines, ...updateData } = req.body;

    // If plant code is provided, resolve it
    if (plantCode) {
      const plant = await Plant.findOne({ code: plantCode });
      if (!plant) {
        res.status(400);
        throw new Error(`Plant with code ${plantCode} not found`);
      }
      updateData.plant = plant._id;
    }

    // If lines are provided with material names, resolve them
    if (lines) {
      const resolvedLines = [];
      for (const line of lines) {
        let materialId = line.material;
        // If material is a string (name), look it up
        if (typeof line.material === 'string' && !line.material.match(/^[0-9a-fA-F]{24}$/)) {
          const material = await Material.findOne({ name: line.material });
          if (!material) {
            res.status(400);
            throw new Error(`Material "${line.material}" not found`);
          }
          materialId = material._id;
        }
        resolvedLines.push({
          material: materialId,
          expected: line.expected,
          received: line.received,
        });
      }
      updateData.lines = resolvedLines;
    }

    const updated = await Delivery.findByIdAndUpdate(delivery._id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('plant', 'code name')
      .populate('lines.material');

    res.json({ success: true, data: formatDelivery(updated) });
  } catch (error) {
    next(error);
  }
};

// Helper: recalculate stock inbound fields for a plant+material
const recalcStockInbound = async (plantId, materialId) => {
  // Sum received from all 'complete' deliveries for this plant+material
  const completeResult = await Delivery.aggregate([
    { $match: { plant: plantId, state: 'complete' } },
    { $unwind: '$lines' },
    { $match: { 'lines.material': materialId } },
    { $group: { _id: null, total: { $sum: '$lines.received' } } },
  ]);
  const inboundComplete = completeResult.length > 0 ? completeResult[0].total : 0;

  // Sum received from all 'physical_pending' deliveries for this plant+material
  const pendingResult = await Delivery.aggregate([
    { $match: { plant: plantId, state: 'physical_pending' } },
    { $unwind: '$lines' },
    { $match: { 'lines.material': materialId } },
    { $group: { _id: null, total: { $sum: '$lines.received' } } },
  ]);
  const inboundPending = pendingResult.length > 0 ? pendingResult[0].total : 0;

  // Update all stock records for this plant+material
  await Stock.updateMany(
    { plant: plantId, material: materialId },
    { inboundComplete, inboundPending }
  );

  // Recalculate closing for each affected stock record
  const stocks = await Stock.find({ plant: plantId, material: materialId });
  for (const stock of stocks) {
    stock.closing = stock.opening + stock.inboundComplete + stock.inboundPending - stock.customerDelivery;
    await stock.save();
  }
};

// @desc    Confirm PGR (Proof of Goods Receipt)
// @route   PATCH /api/deliveries/:id/confirm-pgr
// @access  Public
const confirmPGR = async (req, res, next) => {
  try {
    const delivery = await findDeliveryByIdOrNumber(req.params.id);

    if (!delivery) {
      res.status(404);
      throw new Error('Delivery not found');
    }

    // Update state to complete
    delivery.state = 'complete';

    // Update received quantities from request body if provided
    if (req.body.lines && Array.isArray(req.body.lines)) {
      for (const bodyLine of req.body.lines) {
        const deliveryLine = delivery.lines.id(bodyLine._id);
        if (deliveryLine) {
          deliveryLine.received = bodyLine.received;
        }
      }
    }

    await delivery.save();

    // Recalculate stock for each material in this delivery
    for (const line of delivery.lines) {
      await recalcStockInbound(delivery.plant, line.material);
    }

    const populated = await findDeliveryByIdOrNumberPopulated(delivery._id);
    res.json({ success: true, data: formatDelivery(populated) });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive physical delivery
// @route   PATCH /api/deliveries/:id/receive-physical
// @access  Public
const receivePhysical = async (req, res, next) => {
  try {
    const delivery = await findDeliveryByIdOrNumber(req.params.id);

    if (!delivery) {
      res.status(404);
      throw new Error('Delivery not found');
    }

    // Update state to physical_pending
    delivery.state = 'physical_pending';

    // Update received quantities from request body if provided
    if (req.body.lines && Array.isArray(req.body.lines)) {
      for (const bodyLine of req.body.lines) {
        const deliveryLine = delivery.lines.id(bodyLine._id);
        if (deliveryLine) {
          deliveryLine.received = bodyLine.received;
        }
      }
    }

    await delivery.save();

    // Recalculate stock for each material in this delivery
    for (const line of delivery.lines) {
      await recalcStockInbound(delivery.plant, line.material);
    }

    const populated = await findDeliveryByIdOrNumberPopulated(delivery._id);
    res.json({ success: true, data: formatDelivery(populated) });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync ERP — promote physical_pending to in_transit
// @route   POST /api/deliveries/sync-erp
// @access  Public
const syncERP = async (req, res, next) => {
  try {
    const { plantCode } = req.body;
    let targetPlantId = null;

    if (plantCode) {
      const plant = await Plant.findOne({ code: plantCode });
      if (plant) targetPlantId = plant._id;
    }

    // Find all deliveries with state 'physical_pending'
    const pendingDeliveries = await Delivery.find({ state: 'physical_pending' });

    // Get the highest IBD number for generating new ones
    const lastDelivery = await Delivery.findOne()
      .sort({ ibdNumber: -1 })
      .select('ibdNumber');

    let nextIbdNum = 5000; // default starting point
    if (lastDelivery && lastDelivery.ibdNumber) {
      const match = lastDelivery.ibdNumber.match(/IBD-(\d+)/);
      if (match) {
        nextIbdNum = parseInt(match[1]) + 1;
      }
    }

    const updatedDeliveries = [];
    const affectedStockKeys = new Set(); // Collect unique plant|material pairs to recalculate stock efficiently

    // 1. Promote physical_pending -> in_transit
    for (const delivery of pendingDeliveries) {
      // Generate new IBD number
      delivery.ibdNumber = `IBD-${nextIbdNum++}`;
      delivery.state = 'in_transit';

      // Set expected = received for all lines
      for (const line of delivery.lines) {
        line.expected = line.received;
      }

      await delivery.save();

      // Track affected stock keys for batch recalculation later
      for (const line of delivery.lines) {
        affectedStockKeys.add(`${delivery.plant.toString()}|${line.material.toString()}`);
      }

      const populated = await findDeliveryByIdOrNumberPopulated(delivery._id);
      updatedDeliveries.push(formatDelivery(populated));
    }

    // 2. Generate 5 random deliveries if we have a target plant
    if (targetPlantId) {
      const materials = await Material.find({});
      const suppliers = [
        "Deepak AN Works", "Solar Industries", "Keltech Energies",
        "Economic Explosives Ltd", "Premier Explosives", "Gulf Oil",
        "IDL Explosives", "Rajasthan Explosives"
      ];

      for (let i = 0; i < 5; i++) {
        const poRandom = Math.floor(10000 + Math.random() * 90000); // 5 digit random
        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
        
        const poDate = new Date();
        poDate.setDate(poDate.getDate() - 5);

        const deliveryDate = new Date();

        // 1 to 8 random lines
        const numLines = Math.floor(Math.random() * 8) + 1;
        const shuffledMaterials = [...materials].sort(() => 0.5 - Math.random());
        const lines = [];

        for (let j = 0; j < numLines && j < shuffledMaterials.length; j++) {
          const mat = shuffledMaterials[j];
          let expected = 0;
          if (mat.uom === 't') {
            expected = Math.floor(Math.random() * 46) + 5; // 5 to 50
          } else {
            expected = Math.floor(Math.random() * 1901) + 100; // 100 to 2000
          }

          lines.push({
            material: mat._id,
            expected: expected,
            received: expected,
          });
        }

        const newDelivery = await Delivery.create({
          ibdNumber: `IBD-${nextIbdNum++}`,
          poNumber: `PO-${poRandom}`,
          poDate: poDate,
          plant: targetPlantId,
          date: deliveryDate,
          supplier: supplier,
          state: 'in_transit',
          lines: lines,
        });

        // Track affected stock keys for batch recalculation later
        for (const line of newDelivery.lines) {
          affectedStockKeys.add(`${newDelivery.plant.toString()}|${line.material.toString()}`);
        }

        const populated = await findDeliveryByIdOrNumberPopulated(newDelivery._id);
        updatedDeliveries.push(formatDelivery(populated));
      }
    }

    if (updatedDeliveries.length === 0) {
      return res.json({ success: true, message: 'No deliveries synced or generated.', data: [] });
    }

    // Recalculate stock concurrently for all unique affected plant+material combinations
    const recalcPromises = Array.from(affectedStockKeys).map(key => {
      const [plantId, materialId] = key.split('|');
      return recalcStockInbound(plantId, materialId);
    });
    await Promise.all(recalcPromises);

    res.json({
      success: true,
      message: `Synced and generated ${updatedDeliveries.length} deliveries`,
      data: updatedDeliveries,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  confirmPGR,
  receivePhysical,
  syncERP,
};
