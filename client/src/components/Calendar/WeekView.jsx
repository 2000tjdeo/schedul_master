import React from 'react';
import { getWeekDays, toYMD, isToday, addDays } from '../../utils/dateUtils.js';
import { CATEGORY_COLORS, ACCENT } from '../../utils/colorMap.js';

const DOW_KO = ['월', '화', '수', '목', '금', '토', '일'];

export default function WeekView({ tasks, appointments = [], selectedDate, onSelectDate, weekBase, onWeekChange, onTaskClick, onApptClick }) {
  const baseDate = weekBase ? new Date(weekBase + 'T00:00:00') : new Date(selectedDate + 'T00:00:00');
  const weekDays = getWeekDays(baseDate);

  const getItemsForDay = (date) => {
    const ymd = toYMD(date);
    const dayTasks = tasks.filter(t => (t.task_date || t.due_date) === ymd);
    const dayAppts = appointments.filter(a => a.date === ymd);
    
    // Sort by time
    const items = [
      ...dayTasks.map(t => ({ ...t, type: 'task', time: t.task_time })),
      ...dayAppts.map(a => ({ ...a, type: 'appt', title: a.title || '일정', time: a.start_time, color: a.color }))
    ];
    
    return items.sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  };

  const goToToday = () => {
    const todayYMD = toYMD(new Date());
    onWeekChange(todayYMD);
    onSelectDate(todayYMD);
  };

  const goPrev = () => {
    onWeekChange(toYMD(addDays(baseDate, -7)));
  };

  const goNext = () => {
    onWeekChange(toYMD(addDays(baseDate, 7)));
  };

  // Calculate dynamic height based on max items (aim for 5-6 items visible)
  const allDayStats = weekDays.map(d => getItemsForDay(d).length);
  const maxItems = Math.max(...allDayStats, 5); // at least 5 rows
  const dynamicMinHeight = Math.max(300, maxItems * 48); // each row ~48px

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={goPrev} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666', padding: '4px 8px', borderRadius: 6 }}>
          ‹
        </button>
        <button onClick={goToToday} style={{ border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
          오늘
        </button>
        <button onClick={goNext} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666', padding: '4px 8px', borderRadius: 6 }}>
          ›
        </button>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
          {weekDays[0].getMonth() + 1}/{weekDays[0].getDate()} – {weekDays[6].getMonth() + 1}/{weekDays[6].getDate()}
        </span>
      </div>

      {/* Week grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: dynamicMinHeight, width: '100%', gridColumn: '1 / span 7' }}>
        {weekDays.map((day, i) => {
          const ymd = toYMD(day);
          const todayDay = isToday(ymd);
          const selected = ymd === selectedDate;
          const dayItems = getItemsForDay(day);
          const isWeekend = i >= 5;

          return (
            <div
              key={ymd}
              onClick={() => onSelectDate(ymd)}
              style={{
                borderRight: i < 6 ? '1px solid #f0f0f0' : 'none',
                borderTop: todayDay ? `2px solid ${ACCENT}` : '2px solid transparent',
                background: todayDay ? `rgba(230,51,37,0.04)` : selected ? '#fffbfa' : '#fff',
                padding: '10px 8px',
                cursor: 'pointer',
                transition: 'background 0.1s',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              {/* Day header */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isWeekend ? '#aaa' : '#9ca3af', textTransform: 'uppercase' }}>
                  {DOW_KO[i]}
                </div>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 700,
                  color: todayDay ? ACCENT : isWeekend ? '#aaa' : '#111',
                  lineHeight: 1.1,
                }}>
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                {dayItems.map(item => {
                  const colors = item.type === 'appt' 
                    ? { bg: '#eef2ff', text: '#4338ca', border: item.color || '#6366f1' }
                    : (CATEGORY_COLORS[item.category] || CATEGORY_COLORS['기타']);
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'appt') onApptClick?.(item);
                        else onTaskClick?.(item);
                      }}
                      style={{
                        borderLeft: `3px solid ${colors.border}`,
                        padding: '4px 6px',
                        background: colors.bg,
                        borderRadius: 6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.1s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(0.98)'; e.currentTarget.style.filter = 'brightness(0.95)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}
                    >
                      <div style={{ 
                        fontSize: 10, fontWeight: 700, color: colors.text, 
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                      }}>
                        {item.title}
                      </div>
                      {item.time && (
                        <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)', marginTop: 1 }}>{item.time}</div>
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
    </div>
  );
}
