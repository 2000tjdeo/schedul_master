import React from 'react';
import { CATEGORY_COLORS, PRIORITY_COLORS, PRIORITY_MAP } from '../../utils/colorMap.js';
import { formatTime } from '../../utils/dateUtils.js';

function getAvatarColor(name = '') {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return { text: '오늘', overdue: false, today: true };
  if (diff < 0) return { text: `${Math.abs(diff)}일 전`, overdue: true };
  if (diff === 1) return { text: '내일', overdue: false };
  return { text: `${d.getMonth() + 1}/${d.getDate()}`, overdue: false };
}

export default function KanbanCard({ task, onClick, onMoveTask }) {
  const priorityLabel = PRIORITY_MAP[task.priority] || '중간';
  const priorityColors = PRIORITY_COLORS[priorityLabel];
  const categoryColors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['기타'];
  const dateInfo = formatDateDisplay(task.task_date || task.due_date);
  const timeStr = task.task_time ? formatTime(task.task_time) : null;

  const statusMoves = {
    todo: [{ label: '진행 중 →', status: 'in_progress' }],
    in_progress: [
      { label: '← 할 일', status: 'todo' },
      { label: '완료 →', status: 'done' },
    ],
    done: [
      { label: '← 진행 중', status: 'in_progress' },
      { label: '보관함으로 →', status: 'archived' },
    ],
  };
  const moves = statusMoves[task.status] || [];

  const handleMoveClick = (e, newStatus) => {
    e.stopPropagation();
    onMoveTask(task.id, newStatus);
  };

  return (
    <div
      className="task-card-hover"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        background: '#fff', borderRadius: 8, padding: '10px',
        border: '1px solid #f0f0f0', cursor: 'pointer',
        borderLeft: `3px solid ${categoryColors?.border || '#e5e7eb'}`,
      }}
    >
      {/* Top row: priority + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 700,
          background: priorityColors?.bg || '#f5f5f5', color: priorityColors?.text || '#666',
        }}>
          {priorityLabel}
        </span>
        {dateInfo && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: dateInfo.overdue ? '#ef4444' : dateInfo.today ? '#f59e0b' : '#9ca3af',
          }}>
            {dateInfo.text}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 12, fontWeight: 700, color: '#111', margin: '0 0 6px',
        lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {task.title}
      </h3>

      {/* Info Row: Avatar + Category + Time + Comments */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.assignee_name ? (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: getAvatarColor(task.assignee_name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0,
            }} title={task.assignee_name}>
              {task.assignee_name.slice(0, 1)}
            </div>
          ) : (
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 0px', fontSize: 10, fontWeight: 600,
            color: categoryColors?.text,
          }}>
            {task.category || '업무'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {timeStr && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>{timeStr}</span>
          )}
          {task.comment_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#9ca3af' }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{task.comment_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Move buttons */}
      {moves.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {moves.map(move => (
            <button
              key={move.status}
              onClick={e => handleMoveClick(e, move.status)}
              style={{
                flex: 1, padding: '3px 0', borderRadius: 4, border: '1px solid #f0f0f0',
                background: 'transparent', color: '#9ca3af', fontSize: 10, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = '#f9fafb'; e.target.style.color = '#374151'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#9ca3af'; }}
            >
              {move.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
