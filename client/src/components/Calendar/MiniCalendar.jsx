import React, { useState, useRef } from 'react';
import { CATEGORY_COLORS, ACCENT } from '../../utils/colorMap.js';
import { isToday, toYMD } from '../../utils/dateUtils.js';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export default function MiniCalendar({ tasks, appointments, selectedDate, onSelectDate }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const year = viewYear;
  const month = viewMonth;

  const prevMonth = () => {
    if (month === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startOffset = firstDay.getDay(); // Sunday=0
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
    const dayTasks = tasks.filter(t => {
      const a = t.task_date || t.due_date;
      const b = t.due_date  || t.task_date;
      if (!a) return false;
      const start = a <= b ? a : b;
      const end   = a <= b ? b : a;
      return start <= ymd && ymd <= end;
    });
    const dayAppts = appointments.filter(a => a.date === ymd);
    const all = [...dayAppts, ...dayTasks];
    return all.slice(0, 3).map(item => {
      if (item.category) return CATEGORY_COLORS[item.category]?.border || '#94a3b8';
      return item.color || '#6366f1';
    });
  };

  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) dx < 0 ? nextMonth() : prevMonth();
    touchStartX.current = null;
  };

  return (
    <div style={{ padding: '4px 0' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
        <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: '#6b7280', fontSize: 16, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#374151', fontFamily: 'Manrope' }}>
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: '#6b7280', fontSize: 16, lineHeight: 1 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 12 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, fontWeight: 800,
            color: i === 0 ? '#c97070' : i === 6 ? '#6b8fd4' : '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.1em'
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
          const col = i % 7;
          const dowColor = col === 0 ? '#c97070' : col === 6 ? '#6b8fd4' : '#4b5563';

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
                color: isTd ? '#fff' : isSel ? ACCENT : day.current ? dowColor : '#d1d5db',
                boxShadow: isTd ? `0 4px 12px ${ACCENT}44` : 'none',
                transition: 'all 0.2s',
                fontFamily: 'Manrope, sans-serif'
              }}>
                {day.day}
              </div>
              
              {/* Dots Container */}
              <div style={{
                position: 'absolute', bottom: 3, display: 'flex', gap: 3,
                justifyContent: 'center', width: '100%'
              }}>
                {dots.map((color, idx) => (
                  <div key={idx} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: isTd ? 'rgba(255,255,255,0.9)' : color,
                    flexShrink: 0,
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
