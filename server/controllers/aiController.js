const Plant = require('../models/Plant/Plant');
const Delivery = require('../models/Delivery/Delivery');
const Stock = require('../models/Stock/Stock');

const fmt = (n, uom) => uom === "t" ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString("en-IN");
const unit = (uom) => uom === "t" ? "t" : uom;
const ibdStatus = (d) => {
  switch (d.state) {
    case 'complete': return 'PGR Complete';
    case 'physical_pending': return 'PGR Pending';
    case 'in_transit': return 'In Transit';
    case 'mismatch': return 'Qty Mismatch';
    default: return 'Awaiting PGR';
  }
};

const chatWithAI = async (req, res, next) => {
  try {
    const { messages, plantCode } = req.body;
    
    const plant = await Plant.findOne({ code: plantCode });
    if (!plant) {
        return res.status(404).json({ success: false, message: 'Plant not found' });
    }
    
    const deliveries = await Delivery.find({ plant: plant._id }).populate('lines.material');
    
    // In our prototype mock data, all data is anchored to June 2026. If today's date yields no stock, we could fetch all stocks.
    // Let's just fetch all stocks for this plant and group by material taking the latest date, or since we know it's a prototype, we can fetch all stocks and sort by date descending to get the latest.
    // Wait, the schedule is anchored to today now (we changed it!). Let's just grab all stocks and take the ones for the most recent day.
    const latestStockRecords = await Stock.aggregate([
      { $match: { plant: plant._id } },
      { $sort: { date: -1 } },
      { $group: { _id: "$material", latestRecord: { $first: "$$ROOT" } } }
    ]);
    const stockIds = latestStockRecords.map(r => r.latestRecord._id);
    const stocks = await Stock.find({ _id: { $in: stockIds } }).populate('material');

    const systemPrompt = `You are FOI Assistant, the AI operations copilot for Field Ops Intelligence — a field operations platform for mining and explosives companies. You help supply chain managers and plant operators query inbound deliveries, understand stock positions, and execute operations using natural language.

CURRENT CONTEXT:
- Active plant: ${plant.name} (${plant.code}), ${plant.region}
- Today's date: ${new Date().toLocaleDateString()}

INBOUND DELIVERIES FOR ${plant.name}:
${deliveries.map(d=>`- ${d.ibdNumber} | PO: ${d.poNumber} | Supplier: ${d.supplier} | Date: ${new Date(d.date).toLocaleDateString()} | Status: ${ibdStatus(d)} | Lines: ${d.lines.map(l=>`${l.material.name} (expected: ${l.expected}, received: ${l.received})`).join(", ")}`).join("\n")}

LATEST STOCK POSITION AT ${plant.name}:
${stocks.map(r=>`- ${r.material.name}: Opening ${fmt(r.opening,r.material.uom)}${unit(r.material.uom)}, PGR Complete +${fmt(r.inboundComplete,r.material.uom)}, PGR Pending +${fmt(r.inboundPending,r.material.uom)}, Customer Delivery -${fmt(r.customerDelivery,r.material.uom)}, Closing ${fmt(r.closing,r.material.uom)}${unit(r.material.uom)} (capacity: ${fmt(r.capacity,r.material.uom)}${unit(r.material.uom)}, ${Math.round(r.closing/r.capacity*100)}% full)`).join("\n")}

AVAILABLE ACTIONS — You can execute these by including them in your response as JSON at the end:
- Confirm PGR for an IBD (if all lines match): {"action":"confirm_pgr","ibd_id":"IBD-XXXX"}
- Receive physically (PGR Pending) for mismatched IBD: {"action":"receive_physical","ibd_id":"IBD-XXXX"}
- Trigger ERP sync: {"action":"sync_erp"}

RULES:
- Be concise and direct. You are talking to an operations professional, not a consumer.
- For data questions, answer with specific numbers from the context above.
- For actions, confirm what you are about to do, then include the action JSON.
- Only suggest confirm_pgr if the IBD status is "Awaiting PGR" (not already complete or in transit).
- If asked to do something outside your scope, say so briefly.
- Do not include the action JSON in a code block. Put it on the last line after a blank line.
- Keep responses under 120 words unless a detailed breakdown is asked for.
- Format numbers clearly. Use the IBD IDs exactly as shown.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });
    
    if (!response.ok) {
        const err = await response.text();
        console.error("Anthropic Error:", err);
        return res.status(500).json({ success: false, message: "Anthropic API Error: " + err });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { chatWithAI };
