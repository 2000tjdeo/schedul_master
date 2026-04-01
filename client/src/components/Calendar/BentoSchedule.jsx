import React from 'react';
import { CATEGORY_COLORS, ACCENT } from '../../utils/colorMap.js';

function formatTimeParts(time) {
  if (!time) return { h: '--', m: '--', ampm: 'AM' };
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return { h: String(hh).padStart(2, '0'), m: String(m).padStart(2, '0'), ampm };
}

const STATUS_COLOR = { todo: '#94a3b8', in_progress: '#f59e0b', done: '#10b981' };

function ScheduleCard({ item, type, onClick }) {
  const color = type === 'appt' ? (item.color || '#6366f1') : (CATEGORY_COLORS[item.category]?.border || ACCENT);
  const timeInfo = formatTimeParts(item.start_time || item.task_time);
  const icon = type === 'appt' ? 'group' : 'event_available';
  
  return (
    <div
      onClick={() => onClick?.(item)}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* Time column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 50 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#374151', fontFamily: 'Manrope, sans-serif' }}>
          {timeInfo.h}:{timeInfo.m}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {timeInfo.ampm}
        </span>
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ 
          fontSize: 14, fontWeight: 700, color: '#1a1c1c', 
          fontFamily: 'Inter, sans-serif', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {item.title}
        </h3>
        <p style={{ 
          fontSize: 12, color: '#71717a', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'Inter, sans-serif'
        }}>
          {item.description || item.location || 'No description'}
        </p>
      </div>

      {/* Icon circle */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `${color}15`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function BentoSchedule({
  selectedDate,
  tasks = [],
  appointments = [],
  onTaskClick,
  onApptClick,
}) {
  const dayTasks = tasks.filter(t => {
    const start = t.task_date || t.due_date;
    const end   = t.due_date  || t.task_date;
    return start && start <= selectedDate && selectedDate <= (end || start);
  });
  const dayAppts = appointments.filter(a => a.date === selectedDate);
  const allItems = [
    ...dayAppts.map(a => ({ ...a, _type: 'appt' })),
    ...dayTasks.map(t => ({ ...t, _type: 'task' }))
  ].sort((a, b) => (a.start_time || a.task_time || '99:99').localeCompare(b.start_time || b.task_time || '99:99'));

  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', weekday: 'short',
      })
    : 'Select a date';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '24px 16px 12px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif' }}>
          Today's Schedule
        </h2>
        <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {allItems.length} Events
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {allItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#d1d5db', fontSize: 13 }}>
             No events for today.
          </div>
        ) : (
          allItems.map(item => (
            <ScheduleCard 
              key={`${item._type}-${item.id}`} 
              item={item} 
              type={item._type} 
              onClick={item._type === 'appt' ? onApptClick : onTaskClick} 
            />
          ))
        )}
      </div>
    </div>
  );
}
