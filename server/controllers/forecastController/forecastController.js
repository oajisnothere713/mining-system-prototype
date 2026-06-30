const mongoose = require('mongoose');
const ForecastMaterial = require('../../models/ForecastMaterial/ForecastMaterial');
const ForecastPlan = require('../../models/ForecastPlan/ForecastPlan');
const ForecastAccuracy = require('../../models/ForecastAccuracy/ForecastAccuracy');
const Stock = require('../../models/Stock/Stock');
const Booking = require('../../models/Schedule/Booking');
const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');

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
      const stockRecord = fm.material ? await Stock.findOne({ plant, material: fm.material._id }).sort({ date: -1 }) : null;
      
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
          (dk.products || []).some(p => p.name === fm.material?.name || p.materialId === fm.material?._id?.toString())
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
              if (p.name === fm.material?.name || p.materialId === fm.material?._id?.toString()) {
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
        name: fm.material?.name || 'Unknown Material',
        category: fm.material?.type === 'Bulk' ? 'BULK' : 'IS&PE',
        uom: fm.material?.uom || 'ea',
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
    const materials = materialsRaw.filter(m => m.material?.type === 'Bulk');
    
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

// POST /api/forecast/seed
exports.seedForecastData = async (req, res, next) => {
  try {
    const { plant } = req.query;
    if (!plant) {
      return res.status(400).json({ success: false, message: 'Plant ID is required' });
    }

    const pannaPlant = await Plant.findById(plant);
    if (!pannaPlant) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }

    const plantId = pannaPlant._id;

    await ForecastMaterial.deleteMany({ plant: plantId });
    await ForecastPlan.deleteMany({ plant: plantId });
    await ForecastAccuracy.deleteMany({ plant: plantId });

    const getMats = () => [
      {n:'AN Prill', c:'BULK', u:'t', s:12,  w:[18,16,16,18], lead:5},
      {n:'ANFO', c:'BULK', u:'t', s:380, w:[42,38,45,30], lead:7},
      {n:'Bulk Emulsion', c:'BULK', u:'t', s:60, w:[18,22,20,15], lead:8},
      {n:'Heavy ANFO 30:70', c:'BULK', u:'t', s:95, w:[8,0,9,0], lead:7},
      {n:'Heavy ANFO 40:60', c:'BULK', u:'t', s:40, w:[6,5,4,6], lead:7},
      {n:'Heavy ANFO 50:50', c:'BULK', u:'t', s:14, w:[5,4,5,4], lead:7},
      {n:'Pumpable Emulsion', c:'BULK', u:'t', s:60, w:[0,0,12,0], lead:8},
      {n:'Packaged Emulsion', c:'BULK', u:'t', s:8, w:[3,4,3,3], lead:9},
      {n:'Watergel', c:'BULK', u:'t', s:30, w:[2,3,2,2], lead:9},
      {n:'Doped ANFO', c:'BULK', u:'t', s:5, w:[3,3,2,3], lead:6},
      {n:'Site-Sensitised Emulsion', c:'BULK', u:'t', s:120, w:[20,18,22,20], lead:8},
      {n:'Low-Density ANFO', c:'BULK', u:'t', s:6, w:[4,3,4,3], lead:6},
      {n:'Aluminised ANFO', c:'BULK', u:'t', s:50, w:[3,2,3,2], lead:7},
      {n:'Repumpable Emulsion', c:'BULK', u:'t', s:18, w:[6,5,6,5], lead:8},
      {n:'Electronic Detonator', c:'IS&PE', u:'ea', s:1800, w:[800,600,900,500], lead:10},
      {n:'Cast Booster 400g', c:'IS&PE', u:'ea', s:950, w:[400,400,320,200], lead:9},
      {n:'Cast Booster 150g', c:'IS&PE', u:'ea', s:2200, w:[300,250,300,250], lead:9},
      {n:'Detonating Cord 10 g/m', c:'IS&PE', u:'m', s:2400, w:[200,150,0,100], lead:9},
      {n:'Detonating Cord 5 g/m', c:'IS&PE', u:'m', s:600, w:[100,80,100,80], lead:9},
      {n:'Shock Tube Detonator', c:'IS&PE', u:'ea', s:300, w:[150,120,150,120], lead:10},
      {n:'Surface Connector', c:'IS&PE', u:'ea', s:80, w:[60,50,60,50], lead:8},
      {n:'Plain Detonator', c:'IS&PE', u:'ea', s:200, w:[120,100,120,100], lead:8},
      {n:'Safety Fuse', c:'IS&PE', u:'m', s:1500, w:[100,80,100,80], lead:7},
      {n:'DTH Delay', c:'IS&PE', u:'ea', s:90, w:[70,60,70,60], lead:11},
      {n:'Trunkline Delay', c:'IS&PE', u:'ea', s:40, w:[80,70,80,70], lead:12},
      {n:'Primer Cartridge', c:'IS&PE', u:'ea', s:5000, w:[400,350,400,350], lead:9},
    ];

    const materials = getMats();
    const materialDocs = [];

    for (const m of materials) {
      let matName = m.n;
      if (matName === 'AN Prill') matName = 'Prill';
      if (matName === 'Cast Booster 400g') matName = 'Booster ?" 400g';
      if (matName === 'Detonating Cord 10 g/m') matName = 'Detonating Cord ?" 10g/m';
      if (matName === 'Bulk Emulsion') matName = 'Bulk Emulsion';
      
      const officialMaterial = await Material.findOne({ name: m.n }) || await Material.findOne({ name: matName });
      
      if (!officialMaterial) continue;
      
      materialDocs.push({
        plant: plantId,
        material: officialMaterial._id,
        weeklyDemand: m.w,
        leadTime: m.lead
      });
    }
    
    if (materialDocs.length > 0) {
      await ForecastMaterial.insertMany(materialDocs);
    }

    await ForecastPlan.create({
      plant: plantId,
      status: 'draft',
      confidence: 85
    });

    const accuracyDocs = materials.map(m => ({
      plant: plantId,
      materialName: m.n,
      accuracy: 85 + Math.floor(Math.random() * 15),
      weekOffset: -1
    }));
    await ForecastAccuracy.insertMany(accuracyDocs);

    res.json({ success: true, message: 'Forecast data seeded successfully' });
  } catch (error) {
    next(error);
  }
};
