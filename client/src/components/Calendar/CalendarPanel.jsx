import React, { useState } from 'react';
import CalendarGrid from './CalendarGrid.jsx';
import WeekView from './WeekView.jsx';
import Scheduler from './Scheduler.jsx';
import YearView from './YearView.jsx';
import { ACCENT } from '../../utils/colorMap.js';
import { toYMD, formatKoreanDate } from '../../utils/dateUtils.js';

const CAL_TABS = [
  { id: 'day',   label: 'Day' },
  { id: 'week',  label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year' },
];

export default function CalendarPanel({ tasks, appointments = [], selectedDate, onSelectDate, onTaskClick, onApptClick, onCreateAppt }) {
  const [calTab, setCalTab] = useState('month');
  const [viewYear, setViewYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return d.getMonth();
  });
  const [weekBase, setWeekBase] = useState(selectedDate || toYMD(new Date()));

  const goPrev = () => {
    if (calTab === 'year') {
      setViewYear(y => y - 1);
    } else {
      if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
      else setViewMonth(m => m - 1);
    }
  };
  const goNext = () => {
    if (calTab === 'year') {
      setViewYear(y => y + 1);
    } else {
      if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
      else setViewMonth(m => m + 1);
    }
  };

  const dateObj = new Date(viewYear, viewMonth, 1);
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const yearName = viewYear;
  
  const displayEventCount = [...tasks, ...appointments].filter(item => {
    const d = item.task_date || item.due_date || item.date;
    if (!d) return false;
    if (calTab === 'year') return d.startsWith(String(viewYear));
    return d.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`);
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, background: 'transparent' }}>
      
      {/* Stitch-style Large Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, padding: '0 8px', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
             <button onClick={goPrev} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>
               <span className="material-symbols-outlined" style={{ fontSize: 28 }}>chevron_left</span>
             </button>
             <h2 style={{ 
                fontSize: '2.8rem', fontWeight: 800, color: '#1a1c1c', lineHeight: 1.1, 
                letterSpacing: '-0.03em', fontFamily: 'Manrope, sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
             }}>
               {calTab === 'year' ? yearName : (
                 <>{monthName} <span style={{ color: '#9ca3af', fontWeight: 600 }}>{yearName}</span></>
               )}
             </h2>
             <button onClick={goNext} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>
               <span className="material-symbols-outlined" style={{ fontSize: 28 }}>chevron_right</span>
             </button>
           </div>
           <p style={{ fontSize: 16, color: '#71717a', fontWeight: 500, marginTop: 12 }}>
             {displayEventCount} events scheduled for this {calTab === 'year' ? 'year' : 'month'}
           </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', background: '#f1f1f1', padding: 4, borderRadius: 12, marginLeft: 16, flexShrink: 0 }}>
          {CAL_TABS.map(tab => {
            const active = calTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCalTab(tab.id)}
                style={{
                  padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  background: active ? '#fff' : 'transparent',
                  color: active ? ACCENT : '#71717a',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s',
                  fontFamily: 'Manrope, sans-serif'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div style={{ 
        flex: 1, 
        background: '#fff', 
        borderRadius: 24, 
        border: '1px solid #f1f1f1', 
        overflow: 'hidden', 
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {calTab === 'month' && (
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              tasks={tasks}
              appointments={appointments}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              onTaskClick={onTaskClick}
              onApptClick={onApptClick}
            />
          )}
          {calTab === 'week' && (
            <WeekView
              tasks={tasks}
              appointments={appointments}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              weekBase={weekBase}
              onWeekChange={setWeekBase}
              onTaskClick={onTaskClick}
              onApptClick={onApptClick}
            />
          )}
          {calTab === 'day' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <Scheduler tasks={tasks} appointments={appointments} selectedDate={selectedDate} onTaskClick={onTaskClick} onApptClick={onApptClick} />
            </div>
          )}
          {calTab === 'year' && (
            <YearView
              year={viewYear}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              tasks={tasks}
              appointments={appointments}
            />
          )}
        </div>
      </div>
    </div>
  );
}
