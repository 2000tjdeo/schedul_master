import React from 'react';
import { ACCENT } from '../../utils/colorMap.js';

const TABS = [
  { id: 'calendar', label: 'Home',     icon: 'home' },
  { id: 'kanban',   label: 'Board',    icon: 'dashboard' },
  { id: 'tasks',    label: 'Tasks',    icon: 'assignment' },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0, 0, 0, 0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 50,
      padding: '12px 24px calc(12px + env(safe-area-inset-bottom, 0px))',
      borderRadius: '24px 24px 0 0',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.03)',
    }}>
      {TABS.map(({ id, label, icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              border: 'none', background: active ? `${ACCENT}12` : 'transparent', 
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: active ? '8px 20px' : '8px 0',
              borderRadius: 16,
              color: active ? ACCENT : '#9ca3af',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'Inter, sans-serif',
              minWidth: 70,
            }}
          >
            <span className="material-symbols-outlined" style={{ 
              fontSize: 24, 
              fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" 
            }}>{icon}</span>
            <span style={{
              fontSize: 10, fontWeight: active ? 800 : 500, marginTop: 4,
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
