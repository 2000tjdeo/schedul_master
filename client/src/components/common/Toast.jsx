import React from 'react';

const TYPE_STYLES = {
  success: { border: '1px solid #d1fae5', icon: '✓', iconColor: '#10b981' },
  error: { border: '1px solid #fee2e2', icon: '✕', iconColor: '#ef4444' },
  info: { border: '1px solid #e5e7eb', icon: 'ℹ', iconColor: '#6b7280' },
};

export default function Toast({ toast }) {
  if (!toast) return null;

  const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

  return (
    <div
      key={toast.id}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#fff', border: style.border, borderRadius: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 8,
        zIndex: 9999,
        animation: 'toastIn 0.25s ease',
        whiteSpace: 'nowrap',
        minWidth: 200,
      }}
    >
      <span style={{ color: style.iconColor, fontWeight: 700, fontSize: 14 }}>{style.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{toast.message}</span>
    </div>
  );
}
