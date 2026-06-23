import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Minimize2, Loader2, Send, CheckCircle2, Package, RefreshCw, Zap, Lightbulb } from 'lucide-react';
import { aiService } from '../../services/aiService/aiService';
import { usePlant } from '../../context/PlantContext/PlantContext';
import { getDeliveries, syncERP } from '../../services/deliveryService/deliveryService';
import { buildStock } from '../../utils/stockCalculator/stockCalculator';
import { LOW_PCT } from '../../utils/constants/constants';
import './FOIAssistant.css';

const SUGGESTED = [
  "What IBDs are in transit for this plant?",
  "Show me all deliveries pending PGR",
  "What is the current ANE stock?",
  "Which materials are running low?",
  "Sync ERP for this plant"
];

function parseLLMResponse(text) {
  const lines = text.trim().split("\n");
  let action = null;
  let displayText = text;
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.startsWith("{")) {
    try {
      action = JSON.parse(lastLine);
      displayText = lines.slice(0, -1).join("\n").trim();
    } catch (e) {
      // ignore
    }
  }
  return { displayText, action };
}

function ActionBadge({ action }) {
  if (!action) return null;
  const labels = {
    confirm_pgr: `PGR posted — ${action.ibd_id}`,
    receive_physical: `Physically received — ${action.ibd_id}`,
    sync_erp: "ERP sync triggered"
  };
  const icons = {
    confirm_pgr: CheckCircle2,
    receive_physical: Package,
    sync_erp: RefreshCw
  };
  const Icon = icons[action.action] || Zap;
  return (
    <div className="foi-action-badge">
      <div className="foi-action-badge-header">
        <Lightbulb size={14} style={{ color: '#C04B14' }} />
        ACTION EXECUTED
      </div>
      <div className="foi-action-badge-button">
        <Icon size={16} />
        {labels[action.action] || action.action}
      </div>
    </div>
  );
}

export default function FOIAssistant({ isOpen, onClose, onAction }) {
  const { selectedPlant } = usePlant();
  
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello. I'm FOI Assistant — your AI copilot for inbound deliveries and stock operations. Ask me anything or tap a suggestion below.", action: null }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(420);
  const isResizing = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const startResizing = React.useCallback((e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      let newWidth = window.innerWidth - e.clientX;
      if (newWidth < 300) newWidth = 300;
      if (newWidth > 800) newWidth = 800;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || loading || !selectedPlant) return;
    
    setInput("");
    setMessages(m => [...m, { role: "user", text: q, action: null }]);
    setLoading(true);
    
    try {
      let displayText = "";
      let actionObj = null;
      let handled = false;

      // 1. "What IBDs are in transit for this plant?"
      if (q === "What IBDs are in transit for this plant?") {
        const deliveries = await getDeliveries(selectedPlant.code);
        const transit = deliveries.filter(d => d.plant === selectedPlant.code && d.state === 'in_transit' && !d.hidden);
        if (transit.length === 0) {
          displayText = "There are currently no inbound deliveries in transit for this plant.";
        } else {
          displayText = `There are ${transit.length} deliveries in transit:\n` + transit.map(d => `- ${d.id} (${d.supplier})`).join("\n");
        }
        handled = true;
      }
      // 2. "Show me all deliveries pending PGR"
      else if (q === "Show me all deliveries pending PGR") {
        const deliveries = await getDeliveries(selectedPlant.code);
        const pending = deliveries.filter(d => d.plant === selectedPlant.code && d.state === 'physical_pending' && !d.hidden);
        if (pending.length === 0) {
          displayText = "There are no deliveries physically pending PGR on the lot.";
        } else {
          displayText = `There are ${pending.length} deliveries physically pending PGR:\n` + pending.map(d => `- ${d.id} (${d.supplier})`).join("\n");
        }
        handled = true;
      }
      // 3. "What is the current ANE stock?"
      else if (q === "What is the current ANE stock?") {
        const deliveries = await getDeliveries(selectedPlant.code);
        // Force the date to our mock prototype active date if we are testing from a past baseline
        const targetDate = "2026-06-22"; 
        const computed = buildStock(deliveries, selectedPlant.code, targetDate);
        const todayLedger = computed[targetDate] || [];
        const ane = todayLedger.find(m => m.material.includes("Ammonium Nitrate Emulsion"));
        if (!ane) {
           displayText = "I could not find a stock ledger entry for ANE.";
        } else {
           displayText = `The current stock for Ammonium Nitrate Emulsion (ANE) is **${ane.closing} ${ane.uom}**.\n\nOpening: ${ane.opening}\nInbound: ${ane.pgrC + ane.pgrP}\nCustomer Delivery: ${ane.cd}`;
        }
        handled = true;
      }
      // 4. "Which materials are running low?"
      else if (q === "Which materials are running low?") {
        const deliveries = await getDeliveries(selectedPlant.code);
        const targetDate = "2026-06-22"; 
        const computed = buildStock(deliveries, selectedPlant.code, targetDate);
        const todayLedger = computed[targetDate] || [];
        const low = todayLedger.filter(m => m.capacity > 0 && m.closing <= (m.capacity * LOW_PCT));
        if (low.length === 0) {
          displayText = "All materials are currently above the 15% minimum threshold. Nothing is running low!";
        } else {
          displayText = `The following materials are running low (below ${LOW_PCT * 100}% capacity):\n` + low.map(m => `- **${m.material}**: ${m.closing} / ${m.capacity} ${m.uom}`).join("\n");
        }
        handled = true;
      }
      // 5. "Sync ERP for this plant"
      else if (q === "Sync ERP for this plant") {
        await syncERP(selectedPlant.code);
        displayText = "I have successfully requested an ERP sync for this plant. The delivery states have been updated.";
        actionObj = { action: "sync_erp" };
        handled = true;
      }

      if (!handled) {
        const history = messages.map(m => ({ role: m.role, content: m.text }));
        const newMessages = [...history, { role: "user", content: q }];
        
        const response = await aiService.chatWithAI(newMessages, selectedPlant.code);
        const rawText = response.content?.[0]?.text || "Sorry, I couldn't process that.";
        const { displayText: dt, action: a } = parseLLMResponse(rawText);
        displayText = dt;
        actionObj = a;
      }
      
      setMessages(m => [...m, { role: "assistant", text: displayText, action: actionObj }]);
      if (actionObj && onAction) {
        onAction(actionObj);
      }
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: `Error: ${e.message}`, action: null }]);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="foi-assistant" style={{ width: `${width}px` }}>
      <div className="foi-resizer" onMouseDown={startResizing} />
      <div className="foi-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="foi-header-icon">
            <Sparkles size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <div className="foi-header-title">FOI Assistant</div>
            <div className="foi-header-subtitle">
              <span className="foi-header-dot" />
              Active
            </div>
          </div>
        </div>
        <button onClick={onClose} className="foi-close-btn">
          <Minimize2 size={18} />
        </button>
      </div>

      <div className="foi-messages">
        {messages.map((m, i) => (
          <div key={i} className={`foi-message ${m.role}`}>
            <div className="foi-message-content" style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={`foi-message-bubble ${m.role}`}>
                {m.text}
              </div>
              <ActionBadge action={m.action} />
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="foi-loading-bubble">
            <span className="foi-loading-dot" />
            <span className="foi-loading-dot" />
            <span className="foi-loading-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!loading && (
        <div className="foi-suggestions">
          <div className="foi-suggestions-list">
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => send(s)} className="foi-suggestion-btn">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="foi-input-area">
        <div className="foi-input-box" style={{ borderColor: loading ? "#374151" : "#23272F" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about deliveries, stock, or give an instruction..."
            rows={1}
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={`foi-send-btn ${(input.trim() && !loading) ? 'active' : ''}`}
          >
            {loading ? <Loader2 size={18} className="foi-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
