import React from 'react';

const PRIORITIES = [
  { value: 'all', label: '전체', color: 'bg-slate-400' },
  { value: 'high', label: '높음', color: 'bg-red-500' },
  { value: 'medium', label: '중간', color: 'bg-amber-500' },
  { value: 'low', label: '낮음', color: 'bg-emerald-500' },
];

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

function StatCard({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export default function Sidebar({
  open,
  onClose,
  stats,
  users,
  filterPriority,
  filterAssignee,
  onFilterPriority,
  onFilterAssignee,
}) {
  const sidebarContent = (
    <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 h-full overflow-y-auto">
      <div className="p-5 space-y-6">
        {/* Overview */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">개요</h3>
          <div className="card p-4 space-y-1">
            <StatCard label="전체 작업" value={stats.total} color="bg-indigo-500" />
            <div className="border-t border-slate-100 my-1" />
            <StatCard label="할 일" value={stats.todo} color="bg-slate-400" />
            <StatCard label="진행 중" value={stats.in_progress} color="bg-amber-500" />
            <StatCard label="완료" value={stats.done} color="bg-emerald-500" />
          </div>
        </div>

        {/* Priority filter */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">우선순위 필터</h3>
          <div className="space-y-1">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => onFilterPriority(p.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  filterPriority === p.value
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${p.color}`} />
                {p.label}
                {filterPriority === p.value && (
                  <svg className="ml-auto w-3.5 h-3.5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Assignee filter */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">담당자 필터</h3>
          <div className="space-y-1">
            <button
              onClick={() => onFilterAssignee('all')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                filterAssignee === 'all'
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              전체
            </button>
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => onFilterAssignee(String(user.id))}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  filterAssignee === String(user.id)
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white text-xs font-bold`}>
                  {user.name.slice(0, 1)}
                </div>
                <span className="truncate">{user.name}</span>
                {filterAssignee === String(user.id) && (
                  <svg className="ml-auto w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <div className="relative flex">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
