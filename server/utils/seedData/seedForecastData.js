const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const ForecastMaterial = require('../../models/ForecastMaterial/ForecastMaterial');
const ForecastPlan = require('../../models/ForecastPlan/ForecastPlan');
const ForecastAccuracy = require('../../models/ForecastAccuracy/ForecastAccuracy');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mining-system');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

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

const seedForecastData = async () => {
  try {
    await connectDB();

    const pannaPlant = await Plant.findOne({ code: '2025' });
    if (!pannaPlant) {
      throw new Error('Panna plant not found. Please run main seedData.js first.');
    }

    const plantId = pannaPlant._id;

    console.log('Clearing old forecast data...');
    await ForecastMaterial.deleteMany({ plant: plantId });
    await ForecastPlan.deleteMany({ plant: plantId });
    await ForecastAccuracy.deleteMany({ plant: plantId });

    console.log('Seeding ForecastMaterials...');
    const materials = getMats();
    
    const materialDocs = [];
    for (const m of materials) {
      // Find the official Material document
      // First attempt to match exact name, if not fallback to mapping or matching existing
      let matName = m.n;
      // Handle the case where Forecast Board used slightly different names than seedData
      if (matName === 'AN Prill') matName = 'Prill';
      if (matName === 'Cast Booster 400g') matName = 'Booster — 400g';
      if (matName === 'Detonating Cord 10 g/m') matName = 'Detonating Cord — 10g/m';
      if (matName === 'Bulk Emulsion') matName = 'Bulk Emulsion';
      
      const officialMaterial = await Material.findOne({ name: m.n }) || await Material.findOne({ name: matName });
      
      if (!officialMaterial) {
        console.warn(`Warning: Could not find official material for "${m.n}", skipping...`);
        continue;
      }
      
      materialDocs.push({
        plant: plantId,
        material: officialMaterial._id,
        weeklyDemand: m.w,
        leadTime: m.lead
      });
    }
    
    await ForecastMaterial.insertMany(materialDocs);

    console.log('Seeding ForecastPlan...');
    await ForecastPlan.create({
      plant: plantId,
      status: 'draft',
      confidence: 85
    });

    console.log('Seeding ForecastAccuracy...');
    const accuracyDocs = materialDocs.map(md => ({
      plant: plantId,
      material: md.material,
      accuracy: 85 + Math.floor(Math.random() * 15), // Random 85-99%
      weekOffset: -1
    }));
    await ForecastAccuracy.insertMany(accuracyDocs);

    console.log('Forecast data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding forecast data: ${error.message}`);
    process.exit(1);
  }
};

seedForecastData();
