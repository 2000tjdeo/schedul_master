import React from 'react';

const PRIORITIES = [
  { value: 'all', label: '전체', color: '#94a3b8' },
  { value: 'high', label: '높음', color: '#ef4444' },
  { value: 'medium', label: '중간', color: '#f59e0b' },
  { value: 'low', label: '낮음', color: '#10b981' },
];

function getAvatarColor(name = '') {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{value}</span>
    </div>
  );
}

function SidebarContent({ stats, users, filterPriority, filterAssignee, onFilterPriority, onFilterAssignee }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRight: '1px solid #f0f0f0', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Stats */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            개요
          </div>
          <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 12px', border: '1px solid #f0f0f0' }}>
            <StatRow label="전체 작업" value={stats.total} color="#6366f1" />
            <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
            <StatRow label="할 일" value={stats.todo} color="#94a3b8" />
            <StatRow label="진행 중" value={stats.in_progress} color="#f59e0b" />
            <StatRow label="완료" value={stats.done} color="#10b981" />
          </div>
        </div>

        {/* Priority filter */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            우선순위 필터
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => onFilterPriority(p.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: filterPriority === p.value ? '#f0f9ff' : 'transparent',
                  color: filterPriority === p.value ? '#0369a1' : '#6b7280',
                  fontWeight: filterPriority === p.value ? 700 : 500,
                  fontSize: 13, textAlign: 'left',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                {p.label}
                {filterPriority === p.value && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#0369a1' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Assignee filter */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            담당자 필터
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              onClick={() => onFilterAssignee('all')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: filterAssignee === 'all' ? '#f0f9ff' : 'transparent',
                color: filterAssignee === 'all' ? '#0369a1' : '#6b7280',
                fontWeight: filterAssignee === 'all' ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.1s',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              전체
            </button>

            {users.map(user => (
              <button
                key={user.id}
                onClick={() => onFilterAssignee(String(user.id))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: filterAssignee === String(user.id) ? '#f0f9ff' : 'transparent',
                  color: filterAssignee === String(user.id) ? '#0369a1' : '#6b7280',
                  fontWeight: filterAssignee === String(user.id) ? 700 : 500,
                  fontSize: 13,
                  transition: 'all 0.1s',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: getAvatarColor(user.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {user.name.slice(0, 1)}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                {filterAssignee === String(user.id) && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#0369a1' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
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
  const props = { stats, users, filterPriority, filterAssignee, onFilterPriority, onFilterAssignee };

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex" style={{ height: '100%' }}>
        <SidebarContent {...props} />
      </div>

      {/* Mobile: overlay */}
      {open && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <div style={{ position: 'relative' }}>
            <SidebarContent {...props} />
          </div>
        </div>
      )}
    </>
  );
}
