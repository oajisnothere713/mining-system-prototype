import React from 'react';
import { TrendingUp, LineChart } from 'lucide-react';

export default function AccuracyTab({ forecast, bulkRows }) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const pastWeekDates = Array.from({ length: 4 }).map((_, i) => {
    // i=0 is Wk-4, i=1 is Wk-3, i=2 is Wk-2, i=3 is Wk-1
    const weeksAgo = 4 - i;
    const start = new Date(monday);
    start.setDate(monday.getDate() - (weeksAgo * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6); 
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}`;
    } else {
      return `${start.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}–${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })}`;
    }
  });

  const accVerdict = (s) => 
    s >= 95 ? { fg: '#2E7D46', bg: '#EAF3EC', border: '#C9E0CF', v: 'On target' } :
    s >= 80 ? { fg: '#A66A0C', bg: '#FAF2E0', border: '#EFE2C2', v: 'Acceptable' } :
              { fg: '#C0392B', bg: '#FAE9E7', border: '#F0D9D6', v: 'Needs review' };

  const accData = forecast.accuracy?.length > 0 
    ? forecast.accuracy.map(a => ({
        name: a.materialName,
        a: a.accuracy // Array [Wk-4, Wk-3, Wk-2, Wk-1]
      }))
    : [];

  const accChip = (a) => {
    if (a === null) return { acc: '-', fg: '#9098A1', bg: '#F2F3F5', border: '#E1E4E8', v: 'No data' };
    const v = accVerdict(a);
    return { acc: `${a}%`, fg: v.fg, bg: v.bg, border: v.border, v: v.v };
  };

  const getAverageForWeek = (weekIndex) => {
    if (!accData || accData.length === 0) return null;
    const scores = accData.map(r => r.a[weekIndex]).filter(x => x !== null);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const accWeekScores = [
    { label: 'Wk −4', dates: pastWeekDates[0], score: getAverageForWeek(0) },
    { label: 'Wk −3', dates: pastWeekDates[1], score: getAverageForWeek(1) },
    { label: 'Wk −2', dates: pastWeekDates[2], score: getAverageForWeek(2) },
    { label: 'Wk −1', dates: pastWeekDates[3], score: getAverageForWeek(3) }
  ];

  const accWeeks = accWeekScores.map(w => {
    if (w.score === null) {
      return { ...w, scoreStr: '-', fg: '#9098A1', bg: '#F2F3F5', border: '#E1E4E8', verdict: 'No data' };
    }
    const v = accVerdict(w.score);
    return { ...w, scoreStr: `${w.score}%`, fg: v.fg, bg: v.bg, border: v.border, verdict: v.v };
  });

  const accHeads = ['Wk −4', 'Wk −3', 'Wk −2', 'Wk −1'];
  
  const accRows = accData.map(r => {
    const validScores = r.a.filter(x => x !== null);
    const avg = validScores.length > 0 ? Math.round(validScores.reduce((x, y) => x + y, 0) / validScores.length) : null;
    const v = avg !== null ? accVerdict(avg) : { fg: '#9098A1' };
    return { name: r.name, cells: r.a.map(accChip), avg, avgColor: v.fg };
  });

  return (
    <div className="fc-scroll-area">
      <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
        {accWeeks.map((w, i) => (
          <div key={i} style={{ flex: 1, border: `1px solid ${w.border}`, background: w.bg, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: w.fg }}>{w.scoreStr}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: w.fg, marginTop: '2px' }}>{w.label}</div>
            <div style={{ fontSize: '11px', color: '#5B6470', marginTop: '1px' }}>{w.dates} · {w.verdict}</div>
          </div>
        ))}
        <div style={{ flex: 1.3, background: '#fff', border: '1px solid #E1E4E8', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2E7D46', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} /> Accuracy Trend
          </div>
          <div style={{ fontSize: '12px', color: '#5B6470', marginTop: '5px', lineHeight: 1.5 }}>
            Accuracy is dynamically measured by evaluating the percentage of planned bookings that were successfully marked as delivered.
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #E1E4E8', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LineChart size={16} color="#DC5B16" /> Accuracy by material
          <span style={{ fontWeight: 400, color: '#9098A1', fontSize: '12px', marginLeft: '4px' }}>
            actual ÷ planned · submitted dockets only
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) repeat(4, 1fr) 130px', padding: '0 18px', borderBottom: '1px solid #E1E4E8', background: '#FBFBFC' }}>
          <div style={{ padding: '9px 0', fontSize: '10.5px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Material</div>
          {accHeads.map((h, i) => (
            <div key={i} style={{ padding: '9px 0', fontSize: '10.5px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>{h}</div>
          ))}
          <div style={{ padding: '9px 0', fontSize: '10.5px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>4-wk avg</div>
        </div>

        {accRows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) repeat(4, 1fr) 130px', padding: '0 18px', borderBottom: '1px solid #F2F3F5', alignItems: 'center' }}>
            <div style={{ padding: '11px 0', fontSize: '13px', fontWeight: 600 }}>{r.name}</div>
            {r.cells.map((c, j) => (
              <div key={j} style={{ padding: '11px 0', textAlign: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', color: c.fg, background: c.bg }}>
                  {c.acc}
                </span>
              </div>
            ))}
            <div style={{ padding: '11px 0', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: r.avgColor }}>{r.avg !== null ? `${r.avg}%` : '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
