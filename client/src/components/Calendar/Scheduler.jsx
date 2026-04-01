import React from 'react';
import { CATEGORY_COLORS } from '../../utils/colorMap.js';
import { formatTimeRange } from '../../utils/dateUtils.js';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 07~19

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const STATUS_DOT = {
  done:        { color: '#10b981', label: '완료' },
  in_progress: { color: '#f97316', label: '진행' },
  todo:        { color: '#9ca3af', label: '예정' },
};

export default function Scheduler({ tasks, appointments = [], selectedDate, onTaskClick, onApptClick }) {
  const dayTasks = tasks.filter(t => {
    const start = t.task_date || t.due_date;
    const end   = t.due_date   || t.task_date;
    return start && start <= selectedDate && selectedDate <= (end || start) && t.task_time;
  });
  const dayAppts = appointments.filter(a => a.date === selectedDate);

  const allItems = [
    ...dayTasks.map(t => ({ ...t, _type: 'task', _time: t.task_time })),
    ...dayAppts.map(a => ({ ...a, _type: 'appt', _time: a.start_time })),
  ].sort((a, b) => timeToMinutes(a._time) - timeToMinutes(b._time));

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {allItems.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 80, color: '#d1d5db', fontSize: 13,
        }}>
          일정 없음
        </div>
      ) : (
        <div>
          {HOURS.map(hour => {
            const hourItems = allItems.filter(
              item => Math.floor(timeToMinutes(item._time) / 60) === hour
            );

            if (hourItems.length === 0) return (
              <div key={hour} style={{ display: 'flex', gap: 8, height: 32, borderTop: '1px solid #f4f4f4' }}>
                <div style={{
                  width: 42, flexShrink: 0, paddingTop: 4, textAlign: 'right',
                  fontSize: 10, color: '#e5e7eb', fontWeight: 500,
                }}>
                  {String(hour).padStart(2, '0')}:00
                </div>
              </div>
            );

            return (
              <div key={hour} style={{ display: 'flex', gap: 8, minHeight: 48, borderTop: '1px solid #f0f0f0' }}>
                <div style={{
                  width: 42, flexShrink: 0, paddingTop: 6, textAlign: 'right',
                  fontSize: 10, color: '#bbb', fontWeight: 600,
                }}>
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div style={{ flex: 1, padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {hourItems.map(item => {
                    if (item._type === 'appt') {
                      return (
                        <div
                          key={'a' + item.id}
                          onClick={() => onApptClick?.(item)}
                          style={{
                            position: 'relative',
                            background: item.color + '33',
                            borderRadius: 6, padding: '5px 10px',
                            display: 'flex', alignItems: 'center', gap: 8,
                            cursor: onApptClick ? 'pointer' : 'default',
                            transition: 'filter 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.94)'; }}
                          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                        >

                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: item.color, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 700, color: item.color,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                              {item.start_time} – {item.end_time}
                              {item.location ? ` · ${item.location}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['기타'];
                      const dot    = STATUS_DOT[item.status] || STATUS_DOT.todo;
                      return (
                        <div
                          key={'t' + item.id}
                          onClick={() => onTaskClick?.(item)}
                          style={{
                            position: 'relative',
                            background: colors.bg,
                            borderRadius: 6, padding: '5px 10px',
                            display: 'flex', alignItems: 'center', gap: 8,
                            cursor: onTaskClick ? 'pointer' : 'default',
                            transition: 'filter 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.94)'; }}
                          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                        >

                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: dot.color, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 700, color: colors.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                              {formatTimeRange(item.task_time, item.duration)}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
