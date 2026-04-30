import React from 'react';
import { ACCENT } from '../../utils/colorMap.js';

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function YearView({ year, selectedDate, onSelectDate, tasks = [], appointments = [] }) {
  // Create a fast-lookup map for events by YYYY-MM-DD
  const eventMap = {};
  [...tasks, ...appointments].forEach(item => {
    const d = item.task_date || item.due_date || item.date;
    if (d && d.startsWith(String(year))) {
      eventMap[d] = true;
    }
  });

  const isToday = (y, m, d) => {
    const today = new Date();
    return today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
  };

  const isSelected = (y, m, d) => {
    if (!selectedDate) return false;
    const padding = (n) => String(n).padStart(2, '0');
    return selectedDate === `${y}-${padding(m + 1)}-${padding(d)}`;
  };

  const hasEvent = (y, m, d) => {
    const padding = (n) => String(n).padStart(2, '0');
    return !!eventMap[`${y}-${padding(m + 1)}-${padding(d)}`];
  };

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', height: '100%', background: '#fff' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '32px' 
      }}>
        {MONTHS.map((monthName, mIndex) => {
          const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
          const startDay = new Date(year, mIndex, 1).getDay(); // 0 is Sunday
          
          const currentMonth = new Date().getFullYear() === year && new Date().getMonth() === mIndex;

          const days = [];
          for (let i = 0; i < startDay; i++) {
            days.push(null);
          }
          for (let d = 1; d <= daysInMonth; d++) {
            days.push(d);
          }

          return (
            <div 
              key={monthName}
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '16px',
                border: currentMonth ? `2px solid ${ACCENT}` : '1px solid #f1f1f1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                position: 'relative'
              }}
            >
              <h3 style={{
                fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#1a1c1c', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: 'Manrope, sans-serif'
              }}>
                {monthName}
                {currentMonth && <span style={{ width: 8, height: 8, background: ACCENT, borderRadius: '50%' }} />}
              </h3>
              
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', 
                textAlign: 'center', fontSize: '10px', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 
              }}>
                <div style={{color:'#c97070'}}>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div style={{color:'#6b8fd4'}}>S</div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', 
                textAlign: 'center', fontSize: '12px', color: '#52525b'
              }}>
                {days.map((d, i) => {
                  if (d === null) return <div key={`empty-${i}`} style={{ padding: '4px' }} />;
                  
                  const active = isToday(year, mIndex, d);
                  const selected = isSelected(year, mIndex, d);
                  const event = !active && hasEvent(year, mIndex, d);

                  return (
                    <div 
                      key={d} 
                      onClick={() => {
                        const mStr = String(mIndex + 1).padStart(2, '0');
                        const dStr = String(d).padStart(2, '0');
                        onSelectDate(`${year}-${mStr}-${dStr}`);
                      }}
                      style={{ 
                        padding: '6px 0',
                        cursor: 'pointer',
                        fontWeight: active || selected || event ? 800 : 500,
                        color: active ? '#fff' : (selected || event ? ACCENT : i % 7 === 0 ? '#c97070' : i % 7 === 6 ? '#6b8fd4' : '#52525b'),
                        background: active ? ACCENT : (selected ? `${ACCENT}15` : 'transparent'),
                        borderRadius: '6px',
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (!active && !selected) e.currentTarget.style.background = '#f4f4f5';
                      }}
                      onMouseLeave={e => {
                        if (!active && !selected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {d}
                      {event && (
                        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
