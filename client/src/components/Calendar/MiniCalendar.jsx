import React from 'react';
import { CATEGORY_COLORS, ACCENT } from '../../utils/colorMap.js';
import { isToday, toYMD } from '../../utils/dateUtils.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MiniCalendar({ tasks, appointments, selectedDate, onSelectDate }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startOffset = firstDay.getDay();
  const days = [];
  
  // Padding prev month
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ day: prevLastDay - i, current: false, date: null });
  }
  
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const ymd = toYMD(new Date(year, month, d));
    days.push({ day: d, current: true, date: ymd });
  }

  const getDotsForDay = (ymd) => {
    if (!ymd) return [];
    const dayTasks = tasks.filter(t => (t.task_date || t.due_date) === ymd);
    const dayAppts = appointments.filter(a => a.date === ymd);
    const all = [...dayAppts, ...dayTasks];
    return all.slice(0, 3).map(item => {
      if (item.category) return CATEGORY_COLORS[item.category]?.border || '#94a3b8';
      return item.color || '#6366f1';
    });
  };

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 12 }}>
        {DOW.map(d => (
          <div key={d} style={{ 
            textAlign: 'center', fontSize: 10, fontWeight: 800, 
            color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' 
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 0' }}>
        {days.map((day, i) => {
          const isSel = day.date === selectedDate;
          const isTd = day.date && isToday(day.date);
          const dots = getDotsForDay(day.date);
          
          return (
            <div 
              key={i} 
              onClick={() => day.date && onSelectDate(day.date)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: 48, cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: (isSel || isTd) ? 800 : 500,
                background: isTd ? ACCENT : isSel ? '#fef2f2' : 'transparent',
                color: isTd ? '#fff' : isSel ? ACCENT : day.current ? '#4b5563' : '#d1d5db',
                boxShadow: isTd ? `0 4px 12px ${ACCENT}44` : 'none',
                transition: 'all 0.2s',
                fontFamily: 'Manrope, sans-serif'
              }}>
                {day.day}
              </div>
              
              {/* Dots Container */}
              <div style={{ 
                position: 'absolute', bottom: 4, display: 'flex', gap: 2, 
                justifyContent: 'center', width: '100%' 
              }}>
                {dots.map((color, idx) => (
                  <div key={idx} style={{ 
                    width: 4, height: 4, borderRadius: '50%', 
                    background: isTd ? '#fff' : color 
                  }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
