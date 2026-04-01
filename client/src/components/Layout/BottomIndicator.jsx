import React from 'react';
import { ACCENT } from '../../utils/colorMap.js';

export default function BottomIndicator({ current, total, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
      padding: '8px 0 12px',
    }}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: i === current ? ACCENT : '#d1d5db',
            padding: 0,
            transition: 'all 0.2s',
          }}
          aria-label={`뷰 ${i + 1}`}
        />
      ))}
    </div>
  );
}
