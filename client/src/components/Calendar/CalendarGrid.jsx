import React, { useState, useRef } from 'react';
import { getMonthMatrix, toYMD, isToday, isPast } from '../../utils/dateUtils.js';
import { CATEGORY_COLORS, ACCENT } from '../../utils/colorMap.js';
import { getHoliday } from '../../utils/koreanHolidays.js';

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ── 드래그 중인 아이템 전역 참조 ─────────────────────────────────────────────
// { type: 'task'|'appt', item: object, sourceYmd: string }
const dragState = { current: null };

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
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          dragState.current = {
            type: 'task',
            item: task,
            sourceYmd: task.task_date || task.due_date,
          };
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => { dragState.current = null; }}
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
          cursor: 'grab',
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
function ItemChip({ color, label, sub, onClick, dragItem }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable={!!dragItem}
      onDragStart={(e) => {
        if (!dragItem) return;
        e.stopPropagation();
        dragState.current = {
          type: dragItem.type,
          item: dragItem.item,
          sourceYmd: dragItem.sourceYmd,
        };
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => { dragState.current = null; }}
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
        cursor: 'grab',
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
  if (di === 0)        return '#fff4f4';
  if (di === 6)        return '#f4f7ff';
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
  onTaskDateDrop,   // (task, newYmd) → 업무 날짜 이동
  onApptDateDrop,   // (appt, newYmd) → 약속 날짜 이동
}) {
  const [hoveredId, setHoveredId]     = useState(null);
  const [dragOverYmd, setDragOverYmd] = useState(null); // 드롭 대상 날짜 강조
  const dragCounterRef = useRef({});  // 날짜별 dragenter 카운터

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

  // ── 드래그앤드롭 핸들러 ────────────────────────────────────────────────────
  const handleDragEnter = (ymd, e) => {
    e.preventDefault();
    if (!dragCounterRef.current[ymd]) dragCounterRef.current[ymd] = 0;
    dragCounterRef.current[ymd]++;
    setDragOverYmd(ymd);
  };

  const handleDragLeave = (ymd) => {
    dragCounterRef.current[ymd] = Math.max(0, (dragCounterRef.current[ymd] || 1) - 1);
    if (dragCounterRef.current[ymd] === 0) {
      setDragOverYmd(prev => prev === ymd ? null : prev);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (ymd, e) => {
    e.preventDefault();
    dragCounterRef.current[ymd] = 0;
    setDragOverYmd(null);

    const d = dragState.current;
    if (!d) return;
    if (d.sourceYmd === ymd) return; // 같은 날짜면 무시

    if (d.type === 'task') {
      onTaskDateDrop?.(d.item, ymd);
    } else if (d.type === 'appt') {
      onApptDateDrop?.(d.item, ymd);
    }

    dragState.current = null;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DOW_LABELS.map((d, i) => (
          <div key={d} style={{
            padding: '8px 0', textAlign: 'center',
            fontSize: 11, fontWeight: 700,
            color: i === 0 ? '#c97070' : i === 6 ? '#6b8fd4' : '#9ca3af',
            borderBottom: '1px solid #e0e0e0',
            borderRight: i < 6 ? '1px solid #ebebeb' : 'none',
            background: i === 0 ? '#fff4f4' : i === 6 ? '#f4f7ff' : '#fff',
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
        height: '100%',
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
              const isDragTarget   = dragOverYmd === ymd; // 드롭 대상 강조

              const dayAppts    = getApptForDay(ymd);
              const allDayTasks = getTasksForDay(ymd);

              const barTasks  = allDayTasks.filter(isMultiDay);
              const dotTasks  = allDayTasks.filter(t => !isMultiDay(t));

              const MAX_BARS = 3;
              const MAX_CHIPS = 3;
              const visibleBars = barTasks.slice(0, MAX_BARS);

              // 약속 + 단일 업무를 시간순 정렬 후 슬라이스
              const dotItems = [
                ...dayAppts.map(a => ({ _type: 'appt', _time: a.start_time || '', ...a })),
                ...dotTasks.map(t => ({ _type: 'task', _time: t.task_time  || '', ...t })),
              ].sort((a, b) => {
                if (!a._time && !b._time) return 0;
                if (!a._time) return 1;
                if (!b._time) return -1;
                return a._time.localeCompare(b._time);
              });
              const visibleDotItems = dotItems.slice(0, MAX_CHIPS);

              const overflowBars = Math.max(0, barTasks.length - MAX_BARS);
              const overflowDots = Math.max(0, dotItems.length - visibleDotItems.length);
              const overflow = overflowBars + overflowDots;

              return (
                <div
                  key={ymd}
                  onClick={() => !dragState.current && onSelectDate(ymd)}
                  onDragEnter={(e) => handleDragEnter(ymd, e)}
                  onDragLeave={() => handleDragLeave(ymd)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(ymd, e)}
                  style={{
                    borderTop:   '1px solid #f1f1f1',
                    borderRight: di < 6 ? '1px solid #f1f1f1' : 'none',
                    minHeight: 0,
                    padding: '8px 6px',
                    cursor: isDragTarget ? 'copy' : 'pointer',
                    background: isDragTarget
                      ? `${ACCENT}14`   // 드롭 대상: 연보라 강조
                      : bg,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'background 0.1s',
                    display: 'flex', flexDirection: 'column',
                    outline: isDragTarget ? `2px dashed ${ACCENT}` : 'none',
                    outlineOffset: '-2px',
                  }}
                  onMouseEnter={e => {
                    if (!isDragTarget && !isTodayDay && !isSelected)
                      e.currentTarget.style.background =
                        di === 0 ? '#ffe8e8' : di === 6 ? '#e8eeff' : '#f5f5f5';
                  }}
                  onMouseLeave={e => {
                    if (!isDragTarget && !isTodayDay && !isSelected)
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
                        fontSize: 13, fontWeight: isTodayDay ? 800 : 500, lineHeight: 1,
                        color: isTodayDay      ? '#fff'
                             : !isCurrentMonth ? '#ccc'
                             : (holiday && (holiday.type === 'holiday' || holiday.type === 'substitute')) ? '#e05555'
                             : di === 0         ? '#c97070'
                             : di === 6         ? '#6b8fd4'
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

                  {/* ── 기간 업무 bars ─────────────────────────────────── */}
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

                  {/* ── 칩 행: 약속 + 단일 업무 (시간순) ────────────── */}
                  {visibleDotItems.length > 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      marginTop: visibleBars.length > 0 ? 3 : 2,
                      minWidth: 0,
                    }}>
                      {visibleDotItems.map(item => {
                        if (item._type === 'appt') {
                          return (
                            <ItemChip
                              key={'a' + item.id}
                              color={item.color || '#6366f1'}
                              label={item.title}
                              sub={item.start_time ? item.start_time.slice(0, 5) : undefined}
                              onClick={() => onApptClick?.(item)}
                              dragItem={{ type: 'appt', item, sourceYmd: item.date }}
                            />
                          );
                        }
                        const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['기타'];
                        return (
                          <ItemChip
                            key={'dt' + item.id}
                            color={colors.border}
                            label={item.title}
                            sub={item.task_time ? item.task_time.slice(0, 5) : undefined}
                            onClick={() => onTaskClick?.(item)}
                            dragItem={{ type: 'task', item, sourceYmd: item.task_date || item.due_date }}
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
                  {isSelected && !isDragTarget && (
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
