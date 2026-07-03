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
    
    // Define 4-week calendar window for forecast demand (Monday to Sunday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    const fourWeeksLater = new Date(monday);
    fourWeeksLater.setDate(monday.getDate() + 28);
    
    // Map each forecast material to its real-time stock
    const materials = await Promise.all(forecastMaterials.map(async (fm) => {
      // Find the most recent stock record for this plant and material
      const stockRecord = fm.material ? await Stock.findOne({ plant, material: fm.material._id }).sort({ date: -1 }) : null;
      
      // Calculate top customers and weekly demand from bookings
      const customerStats = {};
      const calculatedDemand = [0, 0, 0, 0];
      
      bookings.forEach(b => {
        if (!b.date) return;
        const bDate = new Date(b.date);
        
        // Filter: Only include bookings within the upcoming 4-week forecast window
        if (bDate < monday || bDate > fourWeeksLater) {
          return;
        }

        let matQty = 0;
        (b.deliveryDockets || []).forEach(dk => {
          (dk.products || []).forEach(p => {
            if (p.name === fm.material?.name || p.materialId === fm.material?._id?.toString()) {
              matQty += p.plannedQty || 0;
            }
          });
        });

        if (matQty > 0) {
          const diffDays = Math.floor((bDate - monday) / (1000 * 60 * 60 * 24));
          const wk = Math.floor(diffDays / 7);
          if (wk >= 0 && wk < 4) {
            calculatedDemand[wk] += matQty;
          }

          const cName = b.customerName || 'Unknown Customer';
          if (!customerStats[cName]) {
            customerStats[cName] = { name: cName, site: b.shipToSite || 'Site', dockets: 0, qty: 0 };
          }
          customerStats[cName].dockets += (b.deliveryDockets || []).length;
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
        weeklyDemand: calculatedDemand,
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

    const plantDoc = await Plant.findById(plant);
    const plantCode = plantDoc ? plantDoc.code : null;
    const bookings = plantCode ? await Booking.find({ plantCode }) : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    const weeksData = Array.from({ length: 4 }).map((_, i) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      let weeklyDockets = 0;
      let unassignedTruckDockets = 0;
      let unassignedCrewDockets = 0;
      const truckSet = new Set();
      const crewSet = new Set();

      let totalScore = 0;
      let totalDockets = 0;

      bookings.forEach(b => {
        if (!b.date) return;
        const bDate = new Date(b.date);
        if (bDate >= start && bDate <= end) {
          (b.deliveryDockets || []).forEach(d => {
            // Do not count capacity for already delivered dockets
            if (d.status === 'Delivered') return;
            
            weeklyDockets++;
            totalDockets++;
            
            let docketScore = 0;
            if ((d.products && d.products.length > 0) || (d.services && d.services.length > 0)) {
              docketScore += 50;
            }
            
            if (d.vehicleId) {
              truckSet.add(d.vehicleId);
              docketScore += 25;
            } else {
              unassignedTruckDockets++;
            }
            
            const hasCrew = (d.operatorIds && d.operatorIds.length > 0) || (d.shotfirerIds && d.shotfirerIds.length > 0);
            if (hasCrew) {
              (d.operatorIds || []).forEach(id => crewSet.add(id));
              (d.shotfirerIds || []).forEach(id => crewSet.add(id));
              docketScore += 25;
            } else {
              unassignedCrewDockets++;
            }
            
            totalScore += docketScore;
          });
        }
      });

      let firmness = 0;
      if (totalDockets > 0) {
        firmness = Math.round(totalScore / totalDockets);
      }

      // Combine explicitly assigned unique resources with a heuristic for unassigned ones
      const truckUsed = truckSet.size + Math.ceil(unassignedTruckDockets / 4);
      const crewUsed = crewSet.size + Math.ceil(unassignedCrewDockets / 2);
      const truckTotal = 5;
      const crewTotal = 8;

      let badge, badgeFg, badgeBg;
      const util = truckUsed / truckTotal;
      
      if (util > 0.8) {
        badge = 'Nearing capacity limits';
        badgeFg = '#C0392B';
        badgeBg = '#FAE9E7';
      } else if (util > 0.5) {
        badge = `${truckTotal - truckUsed} truck · ${crewTotal - crewUsed} crew slots open`;
        badgeFg = '#A66A0C';
        badgeBg = '#FAF2E0';
      } else {
        badge = 'Capacity healthy';
        badgeFg = '#2E7D46';
        badgeBg = '#EAF3EC';
      }

      return {
        dockets: weeklyDockets,
        truckUsed,
        truckTotal,
        crewUsed,
        crewTotal,
        badge,
        badgeFg,
        badgeBg,
        firmness
      };
    });

    const capacityData = {
      weeks: weeksData,
      gaps: [],
    };

    if (weeksData[0].truckUsed > weeksData[0].truckTotal * 0.9) {
      capacityData.gaps.push({ 
        name: 'Capacity Warning', 
        detail: 'Approaching maximum truck capacity for Week 1' 
      });
    }

    // Predictive Customer Gap Analysis
    const eightWeeksAgo = new Date(today);
    eightWeeksAgo.setDate(today.getDate() - (8 * 7));

    const customerHistory = {}; 
    bookings.forEach(b => {
      if (!b.date || !b.customerName) return;
      const bDate = new Date(b.date);
      if (bDate >= eightWeeksAgo && bDate < today) {
        if (!customerHistory[b.customerName]) {
          customerHistory[b.customerName] = { dockets: 0, lastDate: bDate };
        }
        customerHistory[b.customerName].dockets += (b.deliveryDockets || []).length;
        if (bDate > customerHistory[b.customerName].lastDate) {
          customerHistory[b.customerName].lastDate = bDate;
        }
      }
    });

    Object.keys(customerHistory).forEach(cName => {
      const hist = customerHistory[cName];
      const avgWeeklyDockets = hist.dockets / 8; // average over past 8 weeks
      
      // If customer usually orders ~1+ docket per week
      if (avgWeeklyDockets >= 0.8) {
        const futureWeeklyDockets = [0, 0, 0, 0];
        
        bookings.forEach(b => {
          if (b.customerName !== cName || !b.date) return;
          const bDate = new Date(b.date);
          const diffDays = (bDate - monday) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays < 28) {
            const wk = Math.floor(diffDays / 7);
            if (wk >= 0 && wk < 4) {
              futureWeeklyDockets[wk] += (b.deliveryDockets || []).length;
            }
          }
        });

        const emptyWeeks = [];
        for (let i = 0; i < 4; i++) {
          if (futureWeeklyDockets[i] === 0) emptyWeeks.push(`Week ${i + 1}`);
        }

        if (emptyWeeks.length > 0) {
          const daysSinceLast = Math.floor((today - hist.lastDate) / (1000 * 60 * 60 * 24));
          const avgFormatted = Math.round(avgWeeklyDockets * 10) / 10;
          
          let weekStr = emptyWeeks.join(' and ');
          if (emptyWeeks.length > 2) {
             weekStr = emptyWeeks.slice(0, -1).join(', ') + ', and ' + emptyWeeks[emptyWeeks.length - 1];
          }
          
          capacityData.gaps.push({
            name: cName,
            detail: `No bookings in ${weekStr}. Usual pattern is ${avgFormatted} deliveries/week. Last booking was ${daysSinceLast} days ago.`
          });
        }

        // Overbooking Alert
        for (let i = 0; i < 4; i++) {
          if (futureWeeklyDockets[i] >= avgWeeklyDockets * 2 && futureWeeklyDockets[i] > 1) {
            const avgFormatted = Math.round(avgWeeklyDockets * 10) / 10;
            capacityData.gaps.push({
              name: cName,
              detail: `Unusual spike in Week ${i + 1}. Scheduled ${futureWeeklyDockets[i]} deliveries (usual pattern is ${avgFormatted} deliveries/week).`
            });
          }
        }
      }
    });

    // Changes Since Last Review
    const plan = await ForecastPlan.findOne({ plant });
    const lastReviewDate = plan && plan.updatedAt ? plan.updatedAt : new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentChanges = [];
    
    bookings.forEach(b => {
      if (!b.date || !b.updatedAt) return;
      const bDate = new Date(b.date);
      const bUpdated = new Date(b.updatedAt);
      const diffDays = (bDate - monday) / (1000 * 60 * 60 * 24);
      
      // If booking is in the next 4 weeks and was modified since the last plan review
      if (diffDays >= 0 && diffDays < 28 && bUpdated > lastReviewDate) {
        recentChanges.push({
          ref: b.blastNumber,
          cust: b.customerName,
          detail: 'Booking recently modified',
          impact: 'Review schedule for changes',
          impactColor: '#A66A0C',
          border: '#EFE7D6',
          bg: '#FBFAF7'
        });
      }
    });
    
    capacityData.changes = recentChanges;

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

    const plantDoc = await Plant.findById(plant);
    const plantCode = plantDoc ? plantDoc.code : null;
    const bookings = plantCode ? await Booking.find({ plantCode }) : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    const forecastMaterials = await ForecastMaterial.find({ plant }).populate('material');
    
    // Past 4 weeks
    const pastWeekDates = Array.from({ length: 4 }).map((_, i) => {
      const weeksAgo = 4 - i;
      const start = new Date(monday);
      start.setDate(monday.getDate() - (weeksAgo * 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    });

    const accuracyData = forecastMaterials.map(fm => {
      const scores = [null, null, null, null];

      pastWeekDates.forEach((week, index) => {
        let plannedCount = 0;
        let deliveredCount = 0;

        bookings.forEach(b => {
          if (!b.date) return;
          const bDate = new Date(b.date);
          
          if (bDate >= week.start && bDate <= week.end) {
            const hasMaterial = (b.deliveryDockets || []).some(dk => 
              (dk.products || []).some(p => p.name === fm.material?.name || p.materialId === fm.material?._id?.toString())
            );

            if (hasMaterial) {
              plannedCount++;
              
              // We consider it executed if the booking is Delivered OR the specific dockets for this material are Delivered
              const materialDockets = (b.deliveryDockets || []).filter(dk => 
                (dk.products || []).some(p => p.name === fm.material?.name || p.materialId === fm.material?._id?.toString())
              );
              
              const allDelivered = materialDockets.length > 0 && materialDockets.every(dk => dk.status === 'Delivered');
              if (allDelivered || b.status === 'Delivered') {
                deliveredCount++;
              }
            }
          }
        });

        if (plannedCount > 0) {
          scores[index] = Math.round((deliveredCount / plannedCount) * 100);
        }
      });

      return {
        materialName: fm.material?.name || 'Unknown',
        accuracy: scores
      };
    });

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
      
      let officialMaterial = await Material.findOne({ name: m.n }) || await Material.findOne({ name: matName });
      
      if (!officialMaterial) {
        officialMaterial = await Material.create({
          name: m.n,
          type: m.c === 'BULK' ? 'Bulk' : 'Initiating Systems',
          uom: m.u,
          status: 'Active'
        });
      }
      
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
