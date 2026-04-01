import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getMonthMatrix, toYMD, isToday, isPast } from '../../utils/dateUtils.js';
import { CATEGORY_COLORS, ACCENT } from '../../utils/colorMap.js';
import { getHoliday } from '../../utils/koreanHolidays.js';

const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// ── 기간 업무 bar ──────────────────────────────────────────────────────────
function TaskBar({ task, isFirst, isLast, onTaskClick, hovered, onEnter, onLeave }) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS['기타'];
  const past   = isPast(task.due_date || task.task_date);
  
  return (
    <div style={{
      position: 'relative',
      height: 14,
      marginBottom: 2,
      marginLeft:  isFirst ? 0 : -3,
      marginRight: isLast  ? 0 : -3,
      zIndex: hovered ? 20 : 1,
    }}>
      <div
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={e => { e.stopPropagation(); onTaskClick?.(task); }}
        title={task.title}
        style={{
          position: 'absolute',
          top: 0,
          left: 0, right: 0,
          height: hovered ? 20 : 14,
          borderRadius: isFirst && isLast ? 4 : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : 0,
          background: colors.bg,
          border: `1px solid ${colors.border}44`,
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.14s ease',
          display: 'flex', alignItems: 'center',
          padding: '0 4px',
          opacity: past ? 0.4 : 1,
          boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        {isFirst && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: colors.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'Manrope, sans-serif'
          }}>
            {task.title}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 칩 (약속 / 단일 업무) ───────────────────────────────────────────────────
function ItemChip({ color, label, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        width: '100%', minWidth: 0,
        height: 16,
        padding: '0 4px',
        borderRadius: 4,
        background: hovered ? `${color}25` : `${color}12`,
        border: `1px solid ${color}22`,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{
        flex: 1,
        fontSize: 9, fontWeight: 500, color: '#4b5563',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: 'Manrope, sans-serif'
      }}>
        {sub && <span style={{ color, opacity: 0.8, marginRight: 4 }}>{sub}</span>}
        {label}
      </span>
    </div>
  );
}

// ── 날짜 셀 배경 ────────────────────────────────────────────────────────────
function getDayBg(di, isCurrentMonth, isTodayDay, isSelected) {
  if (!isCurrentMonth) return '#f6f6f6';
  if (isTodayDay)      return '#fff7f7';
  if (isSelected)      return '#fff3f3';
  if (di === 5)        return '#f4f7ff';
  if (di === 6)        return '#fff4f4';
  return '#fff';
}

// 기간 업무 여부 판단
function isMultiDay(task) {
  const a = task.task_date || task.due_date;
  const b = task.due_date  || task.task_date;
  return !!(a && b && a !== b);
}

// ── 달력 그리드 ───────────────────────────────────────────────────────────────
export default function CalendarGrid({
  year, month, tasks, appointments = [],
  selectedDate, onSelectDate, onTaskClick, onApptClick,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const weeks = getMonthMatrix(year, month);

  const getApptForDay  = (ymd) => appointments.filter(a => a.date === ymd);
  const getTasksForDay = (ymd) => tasks.filter(t => {
    const a = t.task_date || t.due_date;
    const b = t.due_date  || t.task_date;
    if (!a) return false;
    const start = a <= (b || a) ? a : b;
    const end   = a <= (b || a) ? (b || a) : a;
    return start <= ymd && ymd <= end;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DOW_LABELS.map((d, i) => (
          <div key={d} style={{
            padding: '8px 0', textAlign: 'center',
            fontSize: 11, fontWeight: 700,
            color: i === 5 ? '#6b8fd4' : i === 6 ? '#c97070' : '#9ca3af',
            borderBottom: '1px solid #e0e0e0',
            borderRight: i < 6 ? '1px solid #ebebeb' : 'none',
            background: i === 5 ? '#f4f7ff' : i === 6 ? '#fff4f4' : '#fff',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateRows: 'repeat(6, 1fr)', 
        overflow: 'hidden',
        height: '100%', // 고정 높이 보장
      }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {week.map((day, di) => {
              const ymd            = toYMD(day);
              const isCurrentMonth = day.getMonth() === month;
              const isSelected     = ymd === selectedDate;
              const isTodayDay     = isToday(ymd);
              const bg             = getDayBg(di, isCurrentMonth, isTodayDay, isSelected);
              const holiday        = getHoliday(ymd);

              const dayAppts       = getApptForDay(ymd);
              const allDayTasks    = getTasksForDay(ymd);

              // ── 분리: 기간 업무(bar) vs 단일 업무(dot) ──────────────────
              const barTasks  = allDayTasks.filter(isMultiDay);
              const dotTasks  = allDayTasks.filter(t => !isMultiDay(t));

              // 최대 표시 개수 (공간에 맞춰 제한 - 압축되어 더 많이 표시 가능)
              const MAX_BARS = 3;
              const MAX_CHIPS = 3;
              const visibleBars = barTasks.slice(0, MAX_BARS);
              // 칩: 약속 + 단일 업무 합산
              const dotAppts   = dayAppts;
              const visibleDotAppts = dotAppts.slice(0, MAX_CHIPS);
              const visibleDotTasks = dotTasks.slice(0, Math.max(0, MAX_CHIPS - visibleDotAppts.length));
              
              const overflowBars = Math.max(0, barTasks.length - MAX_BARS);
              const overflowDots = Math.max(0,
                (dotAppts.length - visibleDotAppts.length) +
                (dotTasks.length  - visibleDotTasks.length));
              const overflow = overflowBars + overflowDots;

              return (
                <div
                  key={ymd}
                  onClick={() => onSelectDate(ymd)}
                  style={{
                    borderTop:   '1px solid #f1f1f1',
                    borderRight: di < 6 ? '1px solid #f1f1f1' : 'none',
                    minHeight: 0, // 1fr로 고정하기 위해 0으로 설정
                    padding: '8px 6px',
                    cursor: 'pointer',
                    background: bg,
                    position: 'relative',
                    overflow: 'hidden', // 칸이 확장되지 않도록 강제
                    transition: 'background 0.1s',
                    display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => {
                    if (!isTodayDay && !isSelected)
                      e.currentTarget.style.background =
                        di === 5 ? '#e8eeff' : di === 6 ? '#ffe8e8' : '#f5f5f5';
                  }}
                  onMouseLeave={e => {
                    if (!isTodayDay && !isSelected)
                      e.currentTarget.style.background = bg;
                  }}
                >
                  {/* 날짜 숫자 + 공휴일명 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexShrink: 0 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isTodayDay ? ACCENT : 'transparent',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: (isTodayDay || isTodayDay) ? 800 : 500, lineHeight: 1,
                        color: isTodayDay      ? '#fff'
                             : !isCurrentMonth ? '#ccc'
                             : (holiday && (holiday.type === 'holiday' || holiday.type === 'substitute')) ? '#e05555'
                             : di === 5         ? '#6b8fd4'
                             : di === 6         ? '#c97070'
                             : '#1a1c1c',
                      }}>
                        {day.getDate()}
                      </span>
                    </div>
                    {holiday && isCurrentMonth && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, lineHeight: 1.2,
                        color: holiday.type === 'substitute' ? '#f59e0b' : '#e05555',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 40,
                      }}>
                        {holiday.name}
                      </span>
                    )}
                  </div>

                  {/* ── 기간 업무 bars ───────────────────────────────── */}
                  {visibleBars.map(t => {
                    const start   = t.task_date || t.due_date;
                    const end     = t.due_date   || t.task_date;
                    const isFirst = ymd === start;
                    const isLast  = ymd === end;
                    return (
                      <TaskBar
                        key={'t' + t.id} task={t} isFirst={isFirst} isLast={isLast}
                        onTaskClick={onTaskClick}
                        hovered={hoveredId === 't' + t.id}
                        onEnter={() => setHoveredId('t' + t.id)}
                        onLeave={() => setHoveredId(null)}
                      />
                    );
                  })}

                  {/* ── 칩 행: 약속 + 단일 업무 ─────────────────────── */}
                  {(visibleDotAppts.length > 0 || visibleDotTasks.length > 0) && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      marginTop: visibleBars.length > 0 ? 3 : 2,
                      minWidth: 0,
                    }}>
                      {/* 약속 칩 */}
                      {visibleDotAppts.map(a => (
                        <ItemChip
                          key={'a' + a.id}
                          color={a.color || '#6366f1'}
                          label={a.title}
                          sub={a.start_time ? a.start_time.slice(0, 5) : undefined}
                          onClick={() => onApptClick?.(a)}
                        />
                      ))}
                      {/* 단일 업무 칩 */}
                      {visibleDotTasks.map(t => {
                        const colors = CATEGORY_COLORS[t.category] || CATEGORY_COLORS['기타'];
                        return (
                          <ItemChip
                            key={'dt' + t.id}
                            color={colors.border}
                            label={t.title}
                            sub={t.task_time ? t.task_time.slice(0, 5) : undefined}
                            onClick={() => onTaskClick?.(t)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* 더보기 */}
                  {overflow > 0 && (
                    <div style={{ fontSize: 9, color: '#999', fontWeight: 600, paddingLeft: 4, marginTop: 2 }}>
                      +{overflow}개 더
                    </div>
                  )}

                  {/* 선택 테두리 */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      border: `2px solid ${ACCENT}`,
                      pointerEvents: 'none',
                      zIndex: 10,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
