import React from 'react';
import { ACCENT, STITCH, CATEGORY_COLORS } from '../../utils/colorMap.js';

const NAV_LINKS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  { id: 'kanban',   label: 'Board',    icon: 'dashboard' },
  { id: 'tasks',    label: 'Tasks',    icon: 'assignment' },
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
}) {
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
