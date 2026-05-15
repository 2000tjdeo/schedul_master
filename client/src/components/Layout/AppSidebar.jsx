import React, { useState } from 'react';
import { ACCENT, STITCH, CATEGORY_COLORS } from '../../utils/colorMap.js';

const NAV_LINKS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  { id: 'kanban',   label: 'Board',    icon: 'dashboard' },
  { id: 'feed',     label: 'Feed',     icon: 'feed' },
  { id: 'timeline', label: 'Timeline', icon: 'timeline' },
];

export default function AppSidebar({
  open,
  onClose,
  activeTab,
  onTabChange,
  stats,
  users,
  filterPriority,
  filterAssignee,
  onFilterPriority,
  onFilterAssignee,
  onCreateNew,
  currentUser,
  onLogout,
  onAdmin,
  isMobile,
  projects = [],
  selectedProjectId,
  onSelectProject,
  onArchiveProject,
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const activeProjects  = projects.filter(p => p.status !== 'completed' && (!p.end_date || p.end_date >= today));
  const expiredProjects = projects.filter(p => p.status !== 'completed' && p.end_date && p.end_date < today);
  const completedProjects = projects.filter(p => p.status === 'completed');

  if (!open) return null;

  // On desktop, we don't want the drawer wrapper that blocks the screen
  const containerStyle = isMobile ? {
    position: 'fixed', inset: 0, zIndex: 100,
    display: 'flex',
  } : {
    position: 'fixed', height: '100vh', width: 256, zIndex: 35,
    display: 'flex',
  };

  return (
    <div style={containerStyle}>
      {/* Backdrop (Only for drawer mode/mobile) */}
      {isMobile && (
        <div 
          onClick={onClose}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(4px)',
          }} 
        />
      )}

      {/* Sidebar Content */}
      <aside style={{
        position: 'relative',
        width: 256,
        background: STITCH.side,
        height: '100vh',
        boxShadow: '1px 0 0 rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: 8,
      }}>
        {/* Logo Section */}
        <div style={{ padding: '0 8px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0, boxShadow: `0 4px 12px ${ACCENT}33`,
          }}>
             <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}>calendar_month</span>
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#b7131a', lineHeight: 1.1, fontFamily: 'Manrope, sans-serif' }}>Schedule Master</h1>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Enterprise Edition</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_LINKS.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); if (isMobile) onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#b7131a' : '#52525b',
                  fontWeight: active ? 700 : 500,
                  fontSize: 14, fontFamily: 'Manrope, sans-serif',
                  boxShadow: active ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <span className="material-symbols-outlined" style={{ 
                   fontSize: 20, 
                   fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" 
                }}>{item.icon}</span>
                {item.label}
                {active && <div style={{ position: 'absolute', right: 8, width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />}
              </button>
            );
          })}

          <div style={{ height: 1, background: '#f1f1f1', margin: '16px 0' }} />

          {/* Projects */}
          <div style={{ padding: '0 12px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</div>

          {/* 전체 보기 */}
          <button
            onClick={() => onSelectProject?.(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
              borderRadius: 8, border: 'none', background: !selectedProjectId ? 'rgba(0,0,0,0.04)' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: !selectedProjectId ? '#b7131a' : '#52525b' }}>전체 보기</span>
          </button>

          {/* 활성 프로젝트 */}
          {activeProjects.map(proj => {
            const selected = selectedProjectId === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => onSelectProject?.(proj.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  borderRadius: 8, border: 'none', background: selected ? 'rgba(0,0,0,0.04)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: proj.color || '#6366f1' }} />
                <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? '#b7131a' : '#52525b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {proj.title || proj.name}
                </span>
              </button>
            );
          })}

          {/* 기간 만료 프로젝트 */}
          {expiredProjects.length > 0 && (
            <>
              <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                기간 만료 {expiredProjects.length}건
              </div>
              {expiredProjects.map(proj => {
                const selected = selectedProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 12px',
                      borderRadius: 8, background: selected ? 'rgba(249,115,22,0.08)' : 'transparent',
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: proj.color || '#6366f1', opacity: 0.5 }} />
                    <span
                      onClick={() => onSelectProject?.(proj.id)}
                      style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                    >
                      {proj.title || proj.name}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`"${proj.title || proj.name}" 프로젝트를 아카이브하시겠습니까?`)) {
                          onArchiveProject?.(proj.id);
                        }
                      }}
                      title="아카이브"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2, borderRadius: 4, flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f97316'; e.currentTarget.style.background = '#fff7ed'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'none'; }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>archive</span>
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {/* 아카이브된 프로젝트 토글 */}
          {completedProjects.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 12px',
                  borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#9ca3af' }}>
                  {showCompleted ? 'expand_less' : 'expand_more'}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                  아카이브 {completedProjects.length}건
                </span>
              </button>
              {showCompleted && completedProjects.map(proj => {
                const selected = selectedProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => onSelectProject?.(proj.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                      borderRadius: 8, border: 'none', background: selected ? 'rgba(0,0,0,0.04)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', opacity: 0.5,
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color || '#6366f1' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', textDecoration: 'line-through' }}>{proj.title || proj.name}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Filters (Simplified for Sidebar) */}
          <div style={{ padding: '0 12px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px' }}>
             <div 
               onClick={() => onTabChange('archived')}
               style={{ 
                 display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                 padding: '8px 8px', fontSize: 12, fontWeight: 600,
                 cursor: 'pointer', borderRadius: 8,
                 background: activeTab === 'archived' ? 'rgba(0,0,0,0.04)' : 'transparent',
                 transition: 'background 0.2s',
               }}
               onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
               onMouseLeave={e => e.currentTarget.style.background = activeTab === 'archived' ? 'rgba(0,0,0,0.04)' : 'transparent'}
             >
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af' }} />
                  <span style={{ color: '#71717a' }}>Archive Box</span>
               </div>
               <span style={{ color: '#18181b' }}>{stats.archived || 0}</span>
             </div>
          </div>
        </nav>

        {/* Bottom Actions */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={() => { onCreateNew(); onClose(); }}
            style={{
              width: '100%', padding: '12px', borderRadius: 14, border: 'none',
              background: `linear-gradient(to bottom, ${ACCENT}, #db322f)`,
              color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, 
              fontFamily: 'Manrope, sans-serif',
              boxShadow: `0 8px 24px ${ACCENT}22`,
              transition: 'all 0.2s',
            }}
          >
            New Event
          </button>

          <button onClick={() => { onLogout(); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: '#71717a', fontSize: 13, fontWeight: 500, fontFamily: 'Manrope, sans-serif'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  );
}
