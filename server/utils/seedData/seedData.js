const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const mongoose = require('mongoose');
const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const Delivery = require('../../models/Delivery/Delivery');
const Stock = require('../../models/Stock/Stock');
const CustomerDelivery = require('../../models/CustomerDelivery/CustomerDelivery');

// ============================================================================
// SEED DATA
// ============================================================================

const PLANTS = [
  { code: '2010', name: 'Nimbahera', region: 'Rajasthan' },
  { code: '2025', name: 'Panna', region: 'Madhya Pradesh' },
  { code: '2040', name: 'Muddapur', region: 'Karnataka' },
];

const MATERIALS = {
  // Existing
  'Ammonium Nitrate Emulsion (ANE)': { type: 'Bulk', uom: 't' },
  'Ammonium Nitrate (AN)': { type: 'Bulk', uom: 't' },
  'Bulk Emulsion': { type: 'Bulk', uom: 't' },
  'Prill': { type: 'Bulk', uom: 't' },
  'Detonator — 1.5m, 0.02s': { type: 'Initiating Systems', uom: 'ea' },
  'Booster — 400g': { type: 'Initiating Systems', uom: 'ea' },
  'Detonating Cord — 10g/m': { type: 'Initiating Systems', uom: 'm' },
  
  // From Forecast
  'ANFO': { type: 'Bulk', uom: 't' },
  'Heavy ANFO 30:70': { type: 'Bulk', uom: 't' },
  'Heavy ANFO 40:60': { type: 'Bulk', uom: 't' },
  'Heavy ANFO 50:50': { type: 'Bulk', uom: 't' },
  'Pumpable Emulsion': { type: 'Bulk', uom: 't' },
  'Packaged Emulsion': { type: 'Bulk', uom: 't' },
  'Watergel': { type: 'Bulk', uom: 't' },
  'Doped ANFO': { type: 'Bulk', uom: 't' },
  'Site-Sensitised Emulsion': { type: 'Bulk', uom: 't' },
  'Low-Density ANFO': { type: 'Bulk', uom: 't' },
  'Aluminised ANFO': { type: 'Bulk', uom: 't' },
  'Repumpable Emulsion': { type: 'Bulk', uom: 't' },
  'Electronic Detonator': { type: 'Initiating Systems', uom: 'ea' },
  'Cast Booster 150g': { type: 'Initiating Systems', uom: 'ea' },
  'Detonating Cord 5 g/m': { type: 'Initiating Systems', uom: 'm' },
  'Shock Tube Detonator': { type: 'Initiating Systems', uom: 'ea' },
  'Surface Connector': { type: 'Initiating Systems', uom: 'ea' },
  'Plain Detonator': { type: 'Initiating Systems', uom: 'ea' },
  'Safety Fuse': { type: 'Initiating Systems', uom: 'm' },
  'DTH Delay': { type: 'Initiating Systems', uom: 'ea' },
  'Trunkline Delay': { type: 'Initiating Systems', uom: 'ea' },
  'Primer Cartridge': { type: 'Initiating Systems', uom: 'ea' },
};

const DELIVERIES = [
  {
    id: 'IBD-4401',
    po: 'PO-90112',
    poDate: '28 May 2026',
    plant: '2025',
    date: '03 Jun 2026',
    supplier: 'Deepak AN Works',
    state: 'complete',
    lines: [
      { material: 'Ammonium Nitrate (AN)', expected: 24.0, received: 24.0 },
      { material: 'Detonator — 1.5m, 0.02s', expected: 1200, received: 1200 },
    ],
  },
  {
    id: 'IBD-4402',
    po: 'PO-90118',
    poDate: '30 May 2026',
    plant: '2025',
    date: '03 Jun 2026',
    supplier: 'Emulsion Supply Co',
    state: 'awaiting',
    lines: [
      { material: 'Ammonium Nitrate Emulsion (ANE)', expected: 18.5, received: 18.5 },
      { material: 'Booster — 400g', expected: 400, received: 400 },
    ],
  },
  {
    id: 'IBD-4403',
    po: 'PO-90121',
    poDate: '31 May 2026',
    plant: '2025',
    date: '04 Jun 2026',
    supplier: 'DetCore Systems',
    state: 'in_transit',
    lines: [
      { material: 'Detonator — 1.5m, 0.02s', expected: 1500, received: 1500 },
      { material: 'Detonating Cord — 10g/m', expected: 5000, received: 5000 },
    ],
  },
  {
    id: 'IBD-4404',
    po: 'PO-90109',
    poDate: '27 May 2026',
    plant: '2025',
    date: '02 Jun 2026',
    supplier: 'Deepak AN Works',
    state: 'complete',
    lines: [
      { material: 'Prill', expected: 28.5, received: 28.5 },
      { material: 'Ammonium Nitrate (AN)', expected: 12.0, received: 12.0 },
    ],
  },
  {
    id: 'IBD-4405',
    po: 'PO-90125',
    poDate: '01 Jun 2026',
    plant: '2025',
    date: '04 Jun 2026',
    supplier: 'Emulsion Supply Co',
    state: 'awaiting',
    lines: [
      { material: 'Bulk Emulsion', expected: 22.0, received: 22.0 },
      { material: 'Booster — 400g', expected: 300, received: 300 },
    ],
  },
  {
    id: 'IBD-4408',
    po: 'PO-90130',
    poDate: '01 Jun 2026',
    plant: '2040',
    date: '02 Jun 2026',
    supplier: 'Deepak AN Works',
    state: 'complete',
    lines: [{ material: 'Ammonium Nitrate (AN)', expected: 26.0, received: 26.0 }],
  },
  {
    id: 'IBD-4409',
    po: 'PO-90118',
    poDate: '30 May 2026',
    plant: '2025',
    date: '03 Jun 2026',
    supplier: 'Emulsion Supply Co',
    state: 'complete',
    lines: [{ material: 'Ammonium Nitrate Emulsion (ANE)', expected: 15.0, received: 15.0 }],
  },
];

const STOCK_BASE = {
  '2025': {
    'Ammonium Nitrate (AN)': { opening: 142.0, capacity: 200 },
    'Ammonium Nitrate Emulsion (ANE)': { opening: 88.0, capacity: 150 },
    'Bulk Emulsion': { opening: 60.0, capacity: 120 }, // MATCHES FORECAST
    'Prill': { opening: 54.0, capacity: 120 },
    'Detonator — 1.5m, 0.02s': { opening: 4200, capacity: 6000 },
    'Booster — 400g': { opening: 1500, capacity: 3000 },
    'AN Prill': { opening: 12, capacity: 100 },
    'ANFO': { opening: 380, capacity: 500 },
    'Heavy ANFO 30:70': { opening: 95, capacity: 200 },
    'Heavy ANFO 40:60': { opening: 40, capacity: 100 },
    'Heavy ANFO 50:50': { opening: 14, capacity: 100 },
    'Pumpable Emulsion': { opening: 60, capacity: 150 },
    'Packaged Emulsion': { opening: 8, capacity: 50 },
    'Watergel': { opening: 30, capacity: 100 },
    'Doped ANFO': { opening: 5, capacity: 50 },
    'Site-Sensitised Emulsion': { opening: 120, capacity: 250 },
    'Low-Density ANFO': { opening: 6, capacity: 50 },
    'Aluminised ANFO': { opening: 50, capacity: 100 },
    'Repumpable Emulsion': { opening: 18, capacity: 100 },
    'Electronic Detonator': { opening: 1800, capacity: 3000 },
    'Cast Booster 400g': { opening: 950, capacity: 2000 },
    'Cast Booster 150g': { opening: 2200, capacity: 4000 },
    'Detonating Cord 10 g/m': { opening: 2400, capacity: 5000 },
    'Detonating Cord 5 g/m': { opening: 600, capacity: 1500 },
    'Shock Tube Detonator': { opening: 300, capacity: 1000 },
    'Surface Connector': { opening: 80, capacity: 300 },
    'Plain Detonator': { opening: 200, capacity: 500 },
    'Safety Fuse': { opening: 1500, capacity: 3000 },
    'DTH Delay': { opening: 90, capacity: 300 },
    'Trunkline Delay': { opening: 40, capacity: 200 },
    'Primer Cartridge': { opening: 5000, capacity: 10000 },
  },
  '2010': {
    'Ammonium Nitrate (AN)': { opening: 90.0, capacity: 160 },
    'Ammonium Nitrate Emulsion (ANE)': { opening: 60.0, capacity: 120 },
    'Booster — 400g': { opening: 900, capacity: 2000 },
  },
  '2040': {
    'Ammonium Nitrate (AN)': { opening: 110.0, capacity: 180 },
    'Prill': { opening: 40.0, capacity: 100 },
    'Detonator — 1.5m, 0.02s': { opening: 2000, capacity: 4000 },
  },
};

const CUSTOMER_DELIVERY = {
  '2025': {
    Yesterday: {
      'Ammonium Nitrate (AN)': [['BK-7781', 38.0]],
      'Ammonium Nitrate Emulsion (ANE)': [['BK-7782', 41.0]],
      'Prill': [['BK-7783', 12.0]],
      'Detonator — 1.5m, 0.02s': [['BK-7781', 900]],
      'Booster — 400g': [['BK-7782', 420]],
    },
    Today: {
      'Ammonium Nitrate (AN)': [['BK-7791', 22.0]],
      'Ammonium Nitrate Emulsion (ANE)': [['BK-7792', 48.0]],
      'Prill': [['BK-7793', 14.0]],
      'Detonator — 1.5m, 0.02s': [['BK-7791', 600]],
      'Booster — 400g': [['BK-7792', 300]],
    },
    Tomorrow: {
      'Ammonium Nitrate (AN)': [['BK-7801', 36.0]],
      'Ammonium Nitrate Emulsion (ANE)': [['BK-7802', 30.0]],
      'Prill': [['BK-7803', 10.0]],
      'Detonator — 1.5m, 0.02s': [['BK-7801', 800]],
      'Booster — 400g': [['BK-7802', 250]],
    },
  },
  '2010': {
    Yesterday: {
      'Ammonium Nitrate (AN)': [['BK-3301', 20.0]],
      'Ammonium Nitrate Emulsion (ANE)': [['BK-3302', 25.0]],
      'Booster — 400g': [['BK-3301', 200]],
    },
    Today: {
      'Ammonium Nitrate (AN)': [['BK-3311', 18.0]],
      'Ammonium Nitrate Emulsion (ANE)': [['BK-3312', 22.0]],
      'Booster — 400g': [['BK-3311', 150]],
    },
    Tomorrow: {
      'Ammonium Nitrate (AN)': [['BK-3321', 24.0]],
      'Ammonium Nitrate Emulsion (ANE)': [['BK-3322', 10.0]],
      'Booster — 400g': [['BK-3321', 180]],
    },
  },
  '2040': {
    Yesterday: {
      'Ammonium Nitrate (AN)': [['BK-5501', 30.0]],
      'Prill': [['BK-5502', 8.0]],
      'Detonator — 1.5m, 0.02s': [['BK-5501', 400]],
    },
    Today: {
      'Ammonium Nitrate (AN)': [['BK-5511', 28.0]],
      'Prill': [['BK-5512', 6.0]],
      'Detonator — 1.5m, 0.02s': [['BK-5511', 350]],
    },
    Tomorrow: {
      'Ammonium Nitrate (AN)': [['BK-5521', 26.0]],
      'Prill': [['BK-5522', 5.0]],
      'Detonator — 1.5m, 0.02s': [['BK-5521', 300]],
    },
  },
};

// ============================================================================
// HELPER: Get relative dates for Yesterday/Today/Tomorrow
// ============================================================================
const getRelativeDate = (dayLabel) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dayLabel) {
    case 'Yesterday':
      date.setDate(date.getDate() - 1);
      break;
    case 'Today':
      // date is already today
      break;
    case 'Tomorrow':
      date.setDate(date.getDate() + 1);
      break;
  }

  return date;
};

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================
const seedDatabase = async () => {
  const isFresh = process.argv.includes('--fresh');

  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mining-system';
    console.log(`Connecting to MongoDB: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Fresh seed — drop all collections
    if (isFresh) {
      console.log('\n🗑️  Fresh seed — dropping all collections...');
      await Plant.deleteMany({});
      await Material.deleteMany({});
      await Delivery.deleteMany({});
      await Stock.deleteMany({});
      await CustomerDelivery.deleteMany({});
      console.log('✅ All collections cleared');
    }

    // ── Step 1: Insert Plants ──────────────────────────────────────────
    console.log('\n📌 Seeding Plants...');
    const plantDocs = {};
    for (const p of PLANTS) {
      const existing = await Plant.findOne({ code: p.code });
      if (existing) {
        plantDocs[p.code] = existing;
        console.log(`  ↳ Plant ${p.code} (${p.name}) already exists`);
      } else {
        const created = await Plant.create(p);
        plantDocs[p.code] = created;
        console.log(`  ↳ Created Plant ${p.code} (${p.name})`);
      }
    }
    console.log(`✅ ${Object.keys(plantDocs).length} plants ready`);

    // ── Step 2: Insert Materials ───────────────────────────────────────
    console.log('\n📌 Seeding Materials...');
    const materialDocs = {};
    for (const [name, data] of Object.entries(MATERIALS)) {
      const existing = await Material.findOne({ name });
      if (existing) {
        materialDocs[name] = existing;
        console.log(`  ↳ Material "${name}" already exists`);
      } else {
        const created = await Material.create({ name, ...data });
        materialDocs[name] = created;
        console.log(`  ↳ Created Material "${name}" (${data.type}, ${data.uom})`);
      }
    }
    console.log(`✅ ${Object.keys(materialDocs).length} materials ready`);

    // ── Step 3: Insert Deliveries ──────────────────────────────────────
    console.log('\n📌 Seeding Deliveries...');
    let deliveryCount = 0;
    for (const del of DELIVERIES) {
      const existing = await Delivery.findOne({ ibdNumber: del.id });
      if (existing) {
        console.log(`  ↳ Delivery ${del.id} already exists`);
        continue;
      }

      const plantDoc = plantDocs[del.plant];
      if (!plantDoc) {
        console.error(`  ✗ Plant ${del.plant} not found, skipping ${del.id}`);
        continue;
      }

      const lines = [];
      for (const line of del.lines) {
        const matDoc = materialDocs[line.material];
        if (!matDoc) {
          console.error(`  ✗ Material "${line.material}" not found, skipping line`);
          continue;
        }
        lines.push({
          material: matDoc._id,
          expected: line.expected,
          received: line.received,
        });
      }

      await Delivery.create({
        ibdNumber: del.id,
        poNumber: del.po,
        poDate: new Date(del.poDate),
        plant: plantDoc._id,
        date: new Date(del.date),
        supplier: del.supplier,
        state: del.state,
        lines,
      });

      deliveryCount++;
      console.log(`  ↳ Created Delivery ${del.id} → ${del.plant} (${del.state})`);
    }
    console.log(`✅ ${deliveryCount} deliveries created`);

    // ── Step 4: Insert Stock Base Records ──────────────────────────────
    console.log('\n📌 Seeding Stock base records...');
    let stockCount = 0;
    const yesterdayDate = getRelativeDate('Yesterday');

    for (const [plantCode, materials] of Object.entries(STOCK_BASE)) {
      const plantDoc = plantDocs[plantCode];
      if (!plantDoc) {
        console.error(`  ✗ Plant ${plantCode} not found, skipping stock`);
        continue;
      }

      for (const [matName, data] of Object.entries(materials)) {
        const matDoc = materialDocs[matName];
        if (!matDoc) {
          console.error(`  ✗ Material "${matName}" not found, skipping stock`);
          continue;
        }

        const existing = await Stock.findOne({
          plant: plantDoc._id,
          material: matDoc._id,
          date: yesterdayDate,
        });

        if (existing) {
          console.log(`  ↳ Stock for ${plantCode}/${matName} already exists`);
          continue;
        }

        await Stock.create({
          plant: plantDoc._id,
          material: matDoc._id,
          date: yesterdayDate,
          opening: data.opening,
          inboundComplete: 0,
          inboundPending: 0,
          customerDelivery: 0,
          closing: data.opening, // closing = opening when no movements yet
          capacity: data.capacity,
        });

        stockCount++;
        console.log(`  ↳ Created Stock: ${plantCode} / ${matName} (opening: ${data.opening}, cap: ${data.capacity})`);
      }
    }
    console.log(`✅ ${stockCount} stock records created`);

    // ── Step 5: Insert Customer Delivery Records ───────────────────────
    console.log('\n📌 Seeding Customer Deliveries...');
    let custDelCount = 0;

    for (const [plantCode, days] of Object.entries(CUSTOMER_DELIVERY)) {
      const plantDoc = plantDocs[plantCode];
      if (!plantDoc) {
        console.error(`  ✗ Plant ${plantCode} not found, skipping customer deliveries`);
        continue;
      }

      for (const [dayLabel, materials] of Object.entries(days)) {
        const date = getRelativeDate(dayLabel);

        for (const [matName, bookings] of Object.entries(materials)) {
          const matDoc = materialDocs[matName];
          if (!matDoc) {
            console.error(`  ✗ Material "${matName}" not found, skipping`);
            continue;
          }

          for (const [bookingRef, quantity] of bookings) {
            // Check for existing
            const existing = await CustomerDelivery.findOne({
              plant: plantDoc._id,
              material: matDoc._id,
              dayLabel,
              bookingRef,
            });

            if (existing) {
              console.log(`  ↳ CustomerDelivery ${bookingRef} already exists`);
              continue;
            }

            await CustomerDelivery.create({
              plant: plantDoc._id,
              material: matDoc._id,
              date,
              dayLabel,
              bookingRef,
              quantity,
            });

            custDelCount++;
            console.log(`  ↳ Created CustDel: ${plantCode} / ${matName} / ${dayLabel} → ${bookingRef} (${quantity})`);
          }
        }
      }
    }
    console.log(`✅ ${custDelCount} customer delivery records created`);

    // ── Done ───────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════');
    console.log('🎉 Database seeding complete!');
    console.log('════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

seedDatabase();
