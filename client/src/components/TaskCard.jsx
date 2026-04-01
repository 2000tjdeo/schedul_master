import React from 'react';

const PRIORITY_CONFIG = {
  high:   { label: '높음', badgeClass: 'bg-red-100 text-red-700',     dotClass: 'bg-red-500' },
  medium: { label: '중간', badgeClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-500' },
  low:    { label: '낮음', badgeClass: 'bg-emerald-100 text-emerald-700', dotClass: 'bg-emerald-500' },
};

function getAvatarColor(name = '') {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-pink-500',
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-sky-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

  if (diff < 0) return { text: formatted, overdue: true };
  if (diff === 0) return { text: '오늘', overdue: false, today: true };
  if (diff === 1) return { text: '내일', overdue: false };
  return { text: formatted, overdue: false };
}

export default function TaskCard({ task, onClick, onMoveTask }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dateInfo = formatDate(task.due_date);

  const handleMoveClick = (e, newStatus) => {
    e.stopPropagation();
    onMoveTask(task.id, newStatus);
  };

  const statusMoves = {
    todo: [{ label: '→ 진행 중', status: 'in_progress' }],
    in_progress: [
      { label: '← 할 일', status: 'todo' },
      { label: '→ 완료', status: 'done' },
    ],
    done: [{ label: '← 진행 중', status: 'in_progress' }],
  };
  const moves = statusMoves[task.status] || [];

  return (
    <div
      className="task-card-hover card p-4 cursor-pointer select-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Top row: priority badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`badge ${priority.badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass} mr-1.5`} />
          {priority.label}
        </span>
        {dateInfo && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            dateInfo.overdue
              ? 'bg-red-50 text-red-600'
              : dateInfo.today
                ? 'bg-amber-50 text-amber-600'
                : 'bg-slate-100 text-slate-500'
          }`}>
            {dateInfo.overdue && (
              <svg className="inline w-3 h-3 mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {dateInfo.text}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2 leading-snug">
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
        {/* Assignee avatar */}
        <div className="flex items-center gap-1.5">
          {task.assignee_name ? (
            <div className={`w-6 h-6 rounded-full ${getAvatarColor(task.assignee_name)} flex items-center justify-center text-white text-xs font-bold`} title={task.assignee_name}>
              {task.assignee_name.slice(0, 1)}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {task.assignee_name && (
            <span className="text-xs text-slate-500 truncate max-w-[80px]">{task.assignee_name}</span>
          )}
        </div>

        {/* Comment count */}
        <div className="flex items-center gap-3">
          {task.comment_count > 0 && (
            <div className="flex items-center gap-1 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs font-medium">{task.comment_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Move buttons */}
      {moves.length > 0 && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
          {moves.map(move => (
            <button
              key={move.status}
              onClick={e => handleMoveClick(e, move.status)}
              className="flex-1 text-xs py-1 px-2 rounded-md bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-500 transition-colors font-medium"
            >
              {move.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
