import React from 'react';
import { CATEGORY_COLORS, PRIORITY_COLORS, ACCENT } from '../../utils/colorMap.js';
import { todayYMD, addDays, toYMD } from '../../utils/dateUtils.js';

function Chip({ label, selected, onClick, selectedBg, selectedText, selectedBorder }) {
  const base = {
    display: 'inline-flex', alignItems: 'center',
    padding: '5px 12px', borderRadius: 20,
    border: `1px solid ${selected ? (selectedBorder || selectedBg || ACCENT) : '#e5e7eb'}`,
    background: selected ? (selectedBg || ACCENT) : '#f9fafb',
    color: selected ? (selectedText || '#fff') : '#6b7280',
    fontSize: 12, fontWeight: selected ? 700 : 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    animation: selected ? 'chipPop 0.25s ease' : 'none',
  };
  return (
    <button style={base} onClick={onClick} type="button">
      {label}
    </button>
  );
}

// Generate date chips: 오늘 ~ D+6
function getDateChips() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chips = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const ymd = toYMD(d);
    let label;
    if (i === 0) label = '오늘';
    else if (i === 1) label = '내일';
    else {
      const m = d.getMonth() + 1;
      const day = d.getDate();
      label = `${m}/${day}`;
    }
    chips.push({ label, value: ymd });
  }
  return chips;
}

// Generate time chips: 09:00 ~ 18:00 hourly
function getTimeChips() {
  const chips = [];
  for (let h = 9; h <= 18; h++) {
    const value = `${String(h).padStart(2, '0')}:00`;
    const ampm = h < 12 ? '오전' : '오후';
    const displayH = h % 12 || 12;
    chips.push({ label: `${ampm} ${displayH}시`, value });
  }
  return chips;
}

const TITLE_PRESETS = [
  '클라이언트 미팅', '디자인 검토', '현장 방문', '견적 제출', '납품 확인', '팀 회의',
];

const CATEGORIES = ['업무', '개인', '미팅', '기타'];
const PRIORITIES = [
  { label: '높음', value: 'high' },
  { label: '중간', value: 'medium' },
  { label: '낮음', value: 'low' },
];
const DURATIONS = [
  { label: '30분', value: 30 },
  { label: '1시간', value: 60 },
  { label: '1.5시간', value: 90 },
  { label: '2시간', value: 120 },
  { label: '3시간', value: 180 },
];

export default function ChipGroup({ form, onChange }) {
  const dateChips = getDateChips();
  const timeChips = getTimeChips();

  const set = (key, value) => onChange({ ...form, [key]: value });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Title presets */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>제목 프리셋</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TITLE_PRESETS.map(p => (
            <Chip
              key={p}
              label={p}
              selected={form.title === p}
              onClick={() => set('title', form.title === p ? '' : p)}
              selectedBg="#111"
              selectedText="#fff"
              selectedBorder="#111"
            />
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>카테고리</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(cat => {
            const colors = CATEGORY_COLORS[cat];
            return (
              <Chip
                key={cat}
                label={cat}
                selected={form.category === cat}
                onClick={() => set('category', form.category === cat ? '' : cat)}
                selectedBg={colors?.bg}
                selectedText={colors?.text}
                selectedBorder={colors?.border}
              />
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>우선순위</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRIORITIES.map(p => {
            const colors = PRIORITY_COLORS[p.label];
            return (
              <Chip
                key={p.value}
                label={p.label}
                selected={form.priority === p.value}
                onClick={() => set('priority', form.priority === p.value ? '' : p.value)}
                selectedBg={colors?.bg}
                selectedText={colors?.text}
                selectedBorder={colors?.text}
              />
            );
          })}
        </div>
      </div>

      {/* Date */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>날짜</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {dateChips.map(d => (
            <Chip
              key={d.value}
              label={d.label}
              selected={form.task_date === d.value}
              onClick={() => set('task_date', form.task_date === d.value ? '' : d.value)}
              selectedBg={ACCENT}
              selectedText="#fff"
              selectedBorder={ACCENT}
            />
          ))}
        </div>
      </div>

      {/* Time */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>시간</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {timeChips.map(t => (
            <Chip
              key={t.value}
              label={t.label}
              selected={form.task_time === t.value}
              onClick={() => set('task_time', form.task_time === t.value ? '' : t.value)}
              selectedBg={ACCENT}
              selectedText="#fff"
              selectedBorder={ACCENT}
            />
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>소요 시간</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DURATIONS.map(d => (
            <Chip
              key={d.value}
              label={d.label}
              selected={form.duration === d.value}
              onClick={() => set('duration', form.duration === d.value ? null : d.value)}
              selectedBg="#111"
              selectedText="#fff"
              selectedBorder="#111"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
