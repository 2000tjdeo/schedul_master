import React from 'react';
import { CATEGORY_COLORS, PRIORITY_COLORS, ACCENT } from '../../utils/colorMap.js';
import { formatTime } from '../../utils/dateUtils.js';

const PRIORITY_LABEL = { high: '높음', medium: '중간', low: '낮음' };

function Pill({ label, color, textColor, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: color || '#f3f4f6', color: textColor || '#374151',
      fontSize: 12, fontWeight: 600,
    }}>
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          type="button"
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', opacity: 0.6 }}
        >
          ×
        </button>
      )}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function PreviewBar({ form, onChange, onAdd }) {
  const canAdd = form.title && form.task_date && form.task_time;

  const pills = [];

  if (form.title) {
    pills.push(
      <Pill key="title" label={form.title} color="#111" textColor="#fff"
        onRemove={() => onChange({ ...form, title: '' })} />
    );
  }

  if (form.category) {
    const colors = CATEGORY_COLORS[form.category];
    pills.push(
      <Pill key="cat" label={form.category}
        color={colors?.bg} textColor={colors?.text}
        onRemove={() => onChange({ ...form, category: '' })} />
    );
  }

  if (form.priority) {
    const label = PRIORITY_LABEL[form.priority] || form.priority;
    const colors = PRIORITY_COLORS[label];
    pills.push(
      <Pill key="pri" label={label}
        color={colors?.bg} textColor={colors?.text}
        onRemove={() => onChange({ ...form, priority: '' })} />
    );
  }

  if (form.task_date) {
    pills.push(
      <Pill key="date" label={formatDate(form.task_date)} color="#EFF6FF" textColor="#1D4ED8"
        onRemove={() => onChange({ ...form, task_date: '' })} />
    );
  }

  if (form.task_time) {
    pills.push(
      <Pill key="time" label={formatTime(form.task_time)} color="#F0FDF4" textColor="#15803D"
        onRemove={() => onChange({ ...form, task_time: '' })} />
    );
  }

  if (form.duration) {
    const label = form.duration >= 60
      ? `${form.duration / 60}시간${form.duration % 60 ? ` ${form.duration % 60}분` : ''}`
      : `${form.duration}분`;
    pills.push(
      <Pill key="dur" label={label} color="#FEF9C3" textColor="#713F12"
        onRemove={() => onChange({ ...form, duration: null })} />
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '10px 16px', background: '#fafafa', borderTop: '1px solid #f0f0f0',
      borderRadius: '0 0 12px 12px',
    }}>
      {pills.length > 0 ? (
        <>
          <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>미리보기:</span>
          {pills}
        </>
      ) : (
        <span style={{ fontSize: 12, color: '#aaa' }}>제목, 날짜, 시간을 선택하면 추가 버튼이 활성화됩니다.</span>
      )}

      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          type="button"
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: canAdd ? 'pointer' : 'not-allowed',
            background: canAdd ? '#2563EB' : '#e5e7eb',
            color: canAdd ? '#fff' : '#9ca3af',
            fontWeight: 700, fontSize: 13,
            transition: 'background 0.15s',
          }}
        >
          + 추가
        </button>
      </div>
    </div>
  );
}
