const mongoose = require('mongoose');
const ForecastMaterial = require('../../models/ForecastMaterial/ForecastMaterial');
const ForecastPlan = require('../../models/ForecastPlan/ForecastPlan');
const ForecastAccuracy = require('../../models/ForecastAccuracy/ForecastAccuracy');
const Stock = require('../../models/Stock/Stock');
const Booking = require('../../models/Schedule/Booking');
const Plant = require('../../models/Plant/Plant');

// GET /api/forecast/materials
exports.getMaterials = async (req, res, next) => {
  try {
    const { plant } = req.query;
    if (!plant) {
      return res.status(400).json({ success: false, message: 'Plant ID is required' });
    }
    const forecastMaterials = await ForecastMaterial.find({ plant }).populate('material');
    
    // Fetch plant code to query bookings
    const plantDoc = await Plant.findById(plant);
    const plantCode = plantDoc ? plantDoc.code : null;
    const bookings = plantCode ? await Booking.find({ plantCode }) : [];
    
    // Define 4-week window for forecast demand
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourWeeksLater = new Date(today);
    fourWeeksLater.setDate(today.getDate() + 28);
    
    // Map each forecast material to its real-time stock
    const materials = await Promise.all(forecastMaterials.map(async (fm) => {
      // Find the most recent stock record for this plant and material
      const stockRecord = await Stock.findOne({ plant, material: fm.material._id }).sort({ date: -1 });
      
      // Calculate top customers from bookings
      const customerStats = {};
      bookings.forEach(b => {
        if (!b.date) return;
        const bDate = new Date(b.date);
        
        // Filter: Only include bookings within the upcoming 4-week forecast window
        if (bDate < today || bDate > fourWeeksLater) {
          return;
        }

        const hasMaterial = (b.deliveryDockets || []).some(dk => 
          (dk.products || []).some(p => p.name === fm.material.name || p.materialId === fm.material._id.toString())
        );
        
        if (hasMaterial) {
          const cName = b.customerName || 'Unknown Customer';
          if (!customerStats[cName]) {
            customerStats[cName] = { name: cName, site: b.shipToSite || 'Site', dockets: 0, qty: 0 };
          }
          customerStats[cName].dockets += (b.deliveryDockets || []).length;
          
          let matQty = 0;
          (b.deliveryDockets || []).forEach(dk => {
            (dk.products || []).forEach(p => {
              if (p.name === fm.material.name || p.materialId === fm.material._id.toString()) {
                matQty += p.plannedQty || 0;
              }
            });
          });
          customerStats[cName].qty += matQty;
        }
      });
      
      const topCustomers = Object.values(customerStats)
        .sort((a, b) => b.dockets - a.dockets)
        .slice(0, 3)
        .map(c => ({
          name: c.name,
          site: c.site,
          dockets: c.dockets,
          qty: Math.round(c.qty).toLocaleString('en-US')
        }));
      
      return {
        _id: fm._id,
        plant: fm.plant,
        name: fm.material.name,
        category: fm.material.type === 'Bulk' ? 'BULK' : 'IS&PE',
        uom: fm.material.uom,
        stock: stockRecord ? stockRecord.closing : 0,
        weeklyDemand: fm.weeklyDemand,
        leadTime: fm.leadTime,
        customers: topCustomers,
      };
    }));

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};

// PUT /api/forecast/materials/:id
exports.updateMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { weeklyDemand } = req.body;

    const material = await ForecastMaterial.findByIdAndUpdate(
      id,
      { weeklyDemand },
      { new: true, runValidators: true }
    );

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    res.json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

// GET /api/forecast/plans
exports.getPlan = async (req, res, next) => {
  try {
    const { plant } = req.query;
    if (!plant) {
      return res.status(400).json({ success: false, message: 'Plant ID is required' });
    }

    // Upsert a plan for the plant if none exists
    let plan = await ForecastPlan.findOne({ plant });
    if (!plan) {
      plan = await ForecastPlan.create({ plant, status: 'draft', confidence: 85 });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/forecast/plans/:id/status
exports.updatePlanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'review', 'created'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const plan = await ForecastPlan.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// GET /api/forecast/capacity
exports.getCapacity = async (req, res, next) => {
  try {
    const { plant } = req.query;
    if (!plant) {
      return res.status(400).json({ success: false, message: 'Plant ID is required' });
    }

    // Dynamically derive capacity data based on materials
    const materialsRaw = await ForecastMaterial.find({ plant }).populate('material');
    const materials = materialsRaw.filter(m => m.material.type === 'Bulk');
    
    // Sum total bulk volume for week 0 as the primary requirement
    const requiredVolume = materials.reduce((acc, m) => acc + (m.weeklyDemand[0] || 0), 0);
    
    // Simulate capacity limits based on requirements for the prototype
    const totalCapacity = Math.max(requiredVolume * 1.2, 500); // 20% buffer or min 500t
    
    const capacityData = {
      totalCapacity: Math.round(totalCapacity),
      utilized: requiredVolume,
      gaps: [],
    };

    if (requiredVolume > totalCapacity * 0.9) {
      capacityData.gaps.push('Approaching maximum production capacity for Week 1');
    }

    res.json({ success: true, data: capacityData });
  } catch (error) {
    next(error);
  }
};

// GET /api/forecast/accuracy
exports.getAccuracy = async (req, res, next) => {
  try {
    const { plant } = req.query;
    if (!plant) {
      return res.status(400).json({ success: false, message: 'Plant ID is required' });
    }

    const accuracyData = await ForecastAccuracy.find({ plant });
    res.json({ success: true, data: accuracyData });
  } catch (error) {
    next(error);
  }
};
