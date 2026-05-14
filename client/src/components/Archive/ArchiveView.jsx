import React, { useState, useMemo } from 'react';
import { ACCENT, STITCH } from '../../utils/colorMap.js';

const PRIORITY_COLOR = {
  '높음': { bg: '#FCEBEB', text: '#791F1F' },
  '중간': { bg: '#FAEEDA', text: '#633806' },
  '낮음': { bg: '#EAF3DE', text: '#27500A' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}일 전`;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function groupByMonth(tasks) {
  const map = {};
  tasks.forEach(t => {
    const raw = t.updated_at || t.created_at || '';
    const key = raw ? raw.slice(0, 7) : 'unknown';
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(key) {
  if (key === 'unknown') return '날짜 미상';
  const [y, m] = key.split('-');
  return `${y}년 ${parseInt(m)}월`;
}

export default function ArchiveView({ tasks = [], projects = [], onTaskClick, onRestoreTask }) {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (selectedProjectId && t.project_id !== selectedProjectId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, selectedProjectId, search]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '0 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#64748b' }}>inventory_2</span>
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1c1c', margin: 0, fontFamily: 'Manrope, sans-serif' }}>Archive Storage</h2>
            <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>완료 후 보관된 업무 {tasks.length}건</p>
          </div>
        </div>

        {/* Search + Project Filter */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, color: '#9ca3af', pointerEvents: 'none',
            }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="아카이브 검색..."
              style={{
                width: '100%', padding: '8px 10px 8px 32px',
                border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13,
                outline: 'none', background: '#fff', color: '#111',
              }}
            />
          </div>
        </div>

        {/* Project Pills */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedProjectId(null)}
              style={{
                padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: !selectedProjectId ? ACCENT : '#f1f5f9',
                color: !selectedProjectId ? '#fff' : '#52525b',
              }}
            >전체</button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id === selectedProjectId ? null : p.id)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  background: selectedProjectId === p.id ? (p.color || '#6366f1') : '#f1f5f9',
                  color: selectedProjectId === p.id ? '#fff' : '#52525b',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: selectedProjectId === p.id ? '#fff' : (p.color || '#6366f1'), flexShrink: 0 }} />
                {p.title || p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Archived list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d1d5db' }}>inventory_2</span>
            <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>
              {search || selectedProjectId ? '검색 결과가 없습니다' : '보관된 업무가 없습니다'}
            </p>
          </div>
        ) : (
          grouped.map(([monthKey, monthTasks]) => (
            <div key={monthKey} style={{ marginBottom: 28 }}>
              {/* Month Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {monthLabel(monthKey)}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 10,
                  background: '#f1f5f9', color: '#64748b',
                }}>{monthTasks.length}</span>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              </div>

              {/* Task Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {monthTasks.map(task => {
                  const proj = task.project_id ? projectMap[task.project_id] : null;
                  const pc = PRIORITY_COLOR[task.priority];
                  return (
                    <div
                      key={task.id}
                      style={{
                        background: '#fff',
                        borderRadius: 14,
                        border: '1px solid #f1f5f9',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'box-shadow 0.15s',
                        cursor: 'pointer',
                      }}
                      onClick={() => onTaskClick?.(task)}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {/* Check icon */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                        background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 14, fontWeight: 700, color: '#374151',
                            textDecoration: 'line-through', textDecorationColor: '#d1d5db',
                          }}>
                            {task.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {proj && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                              background: (proj.color || '#6366f1') + '22',
                              color: proj.color || '#6366f1',
                            }}>
                              {proj.title || proj.name}
                            </span>
                          )}
                          {task.priority && pc && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: pc.bg, color: pc.text }}>
                              {task.priority}
                            </span>
                          )}
                          {task.assignee && (
                            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>@ {task.assignee}</span>
                          )}
                          <span style={{ fontSize: 11, color: '#c4c4c4', marginLeft: 'auto' }}>{timeAgo(task.updated_at || task.created_at)}</span>
                        </div>
                      </div>

                      {/* Restore button */}
                      <button
                        onClick={e => { e.stopPropagation(); onRestoreTask?.(task.id); }}
                        title="복구 (Done으로 이동)"
                        style={{
                          flexShrink: 0, padding: '5px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
                          background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#52525b',
                          display: 'flex', alignItems: 'center', gap: 4,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#52525b'; }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>restore</span>
                        복구
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
