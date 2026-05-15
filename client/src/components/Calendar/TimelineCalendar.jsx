import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, isToday, differenceInDays, parseISO } from 'date-fns';
import { ACCENT, CATEGORY_COLORS } from '../../utils/colorMap.js';

// ── Milestone Calendar (Bar Type) ───────────────────────────────────────────────
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const STATUS_LABEL = { todo: '할 일', in_progress: '진행 중', done: '완료' };
const STATUS_COLOR = { todo: '#94a3b8', in_progress: '#f59e0b', done: '#10b981' };
const BAR_H = 18;
const MAX_BARS = 3;

function assignLanes(bars) {
  const lanes = [];
  bars.forEach(bar => {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      const last = lanes[i][lanes[i].length - 1];
      if (last.endCol < bar.startCol) {
        lanes[i].push(bar);
        bar.lane = i;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bar.lane = lanes.length;
      lanes.push([bar]);
    }
  });
  return lanes.length;
}

function getBarsForWeek(items, week) {
  const weekDates = week.map(d => d.date).filter(Boolean);
  if (!weekDates.length) return [];
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const bars = [];
  items.forEach(item => {
    const s = item.task_date || item.due_date || item.date;
    const e = item.due_date || item.task_date || item.date;
    if (!s) return;
    const taskStart = s <= e ? s : e;
    const taskEnd = s <= e ? e : s;
    if (taskEnd < weekStart || taskStart > weekEnd) return;

    const clippedStart = taskStart < weekStart ? weekStart : taskStart;
    const clippedEnd = taskEnd > weekEnd ? weekEnd : taskEnd;

    const startCol = week.findIndex(d => d.date === clippedStart);
    const endCol = week.findIndex(d => d.date === clippedEnd);
    if (startCol === -1 || endCol === -1) return;

    bars.push({
      item, startCol, endCol,
      color: item.color || item._projColor || ACCENT,
      label: item.title,
      isStart: clippedStart === taskStart,
      isEnd: clippedEnd === taskEnd,
      lane: 0,
    });
  });

  bars.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));
  assignLanes(bars);
  return bars;
}

function MilestoneCalendar({ tasks = [], appointments = [], projects = [], onTaskClick, onApptClick }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = firstDay.getDay();
  const days = [];
  const prevLastDay = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) days.push({ day: prevLastDay - i, current: false, date: null });
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, current: true, date: new Date(viewYear, viewMonth, d).toISOString().slice(0, 10) });
  }
  // pad to full rows
  while (days.length % 7 !== 0) days.push({ day: null, current: false, date: null });

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // 태스크에 프로젝트 색상 주입
  const coloredTasks = tasks.map(t => {
    const proj = projects.find(p => p.id === t.project_id);
    return { ...t, _projColor: proj?.color || ACCENT };
  });
  const coloredAppts = appointments.map(a => ({ ...a, _projColor: a.color || '#8b5cf6' }));
  const allItems = [...coloredAppts, ...coloredTasks];

  const selectedTasks = tasks.filter(t => {
    const s = t.task_date || t.due_date;
    const e = t.due_date || t.task_date;
    return s && s <= selectedDate && selectedDate <= (e || s);
  });
  const selectedAppts = appointments.filter(a => a.date === selectedDate);

  const selDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selDateStr = selDateObj?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 달력 */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f1f1', padding: '20px 16px' }}>
        {/* 월 네비게이션 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', padding: '4px 10px' }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope' }}>
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button onClick={nextMonth} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', padding: '4px 10px' }}>›</button>
        </div>

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DOW.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, paddingBottom: 6,
              color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : '#9ca3af' }}>
              {d}
            </div>
          ))}
        </div>

        {/* 주별 렌더링 */}
        {weeks.map((week, wi) => {
          const bars = getBarsForWeek(allItems, week);
          const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), -1);
          const laneCount = Math.min(maxLane + 1, MAX_BARS);

          return (
            <div key={wi} style={{ marginBottom: 4 }}>
              {/* 날짜 숫자 행 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((day, di) => {
                  const isSel = day.date === selectedDate;
                  const isTd = day.date === todayStr;
                  const dowColor = di === 0 ? '#f87171' : di === 6 ? '#60a5fa' : '#4b5563';
                  return (
                    <div
                      key={di}
                      onClick={() => day.date && setSelectedDate(day.date)}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 34, cursor: day.date ? 'pointer' : 'default' }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: (isSel || isTd) ? 800 : 400,
                        background: isTd ? '#1a1c1c' : isSel ? '#f1f5f9' : 'transparent',
                        color: isTd ? '#fff' : day.current ? (isSel ? '#1a1c1c' : dowColor) : '#d1d5db',
                        border: isSel && !isTd ? '2px solid #1a1c1c' : '2px solid transparent',
                        fontFamily: 'Manrope', transition: 'all 0.15s',
                      }}>
                        {day.day}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 바 레인들 */}
              {laneCount > 0 && (
                <div style={{ position: 'relative', paddingBottom: 4 }}>
                  {Array.from({ length: laneCount }, (_, li) => (
                    <div key={li} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: BAR_H + 2, marginBottom: 2 }}>
                      {bars.filter(b => b.lane === li).map((bar, bi) => {
                        const span = bar.endCol - bar.startCol + 1;
                        const isAppt = !!bar.item.date && !bar.item.task_date && !bar.item.due_date;
                        return (
                          <div
                            key={bi}
                            onClick={() => isAppt ? onApptClick?.(bar.item) : onTaskClick?.(bar.item)}
                            title={bar.label}
                            style={{
                              gridColumn: `${bar.startCol + 1} / span ${span}`,
                              height: BAR_H,
                              background: bar.color + 'cc',
                              borderRadius: `${bar.isStart ? 6 : 0}px ${bar.isEnd ? 6 : 0}px ${bar.isEnd ? 6 : 0}px ${bar.isStart ? 6 : 0}px`,
                              display: 'flex', alignItems: 'center',
                              paddingLeft: bar.isStart ? 6 : 2,
                              paddingRight: bar.isEnd ? 6 : 2,
                              cursor: 'pointer', overflow: 'hidden',
                              marginLeft: bar.isStart ? 1 : 0,
                              marginRight: bar.isEnd ? 1 : 0,
                              borderLeft: !bar.isStart ? `2px solid ${bar.color}` : 'none',
                            }}
                          >
                            {bar.isStart && (
                              <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bar.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택일 상세 목록 */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f1f1', padding: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1a1c1c', margin: '0 0 12px', fontFamily: 'Manrope' }}>
          {selDateStr} 일정
        </h4>
        {selectedAppts.length === 0 && selectedTasks.length === 0 ? (
          <p style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', padding: '20px 0', margin: 0 }}>이 날 일정이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedAppts.map(a => (
              <div key={a.id} onClick={() => onApptClick?.(a)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: '#f5f3ff', border: '1px solid #ede9fe', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                onMouseLeave={e => e.currentTarget.style.background = '#f5f3ff'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8b5cf6', flexShrink: 0 }}>event</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1c1c', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  {a.start_time && <p style={{ fontSize: 11, color: '#8b5cf6', margin: '2px 0 0', fontWeight: 600 }}>{a.start_time.slice(0, 5)}{a.end_time ? ` ~ ${a.end_time.slice(0, 5)}` : ''}</p>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', background: '#ede9fe', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>약속</span>
              </div>
            ))}
            {selectedTasks.map(t => {
              const proj = projects.find(p => p.id === t.project_id);
              const pColor = proj?.color || ACCENT;
              const isDue = t.due_date === selectedDate;
              return (
                <div key={t.id} onClick={() => onTaskClick?.(t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: '#fafafa', borderLeft: `3px solid ${pColor}`, border: `1px solid #f1f1f1`, borderLeftWidth: 3, transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {proj && <span style={{ fontSize: 10, fontWeight: 700, color: pColor }}>{proj.name || proj.title}</span>}
                      {isDue && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>마감</span>}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1c1c', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, flexShrink: 0, background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const COL_W = 36; // px per day column
const ROW_H = 56; // px per task row
const LEFT_W = 192; // px for task name column

// ── Gantt Chart Component ───────────────────────────────────────────────────────
function GanttChart({ tasks = [], onTaskClick, projectColor = ACCENT, projects = [] }) {
  const getTaskColor = (task) => {
    if (task.project_id && projects?.length > 0) {
      const project = projects.find(p => p.id === task.project_id);
      if (project?.color) return project.color;
    }
    return projectColor;
  };

  const dateRange = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.task_date || t.due_date);
    if (tasksWithDates.length === 0) {
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 13) });
    }
    const allDates = tasksWithDates.flatMap(t => [t.task_date, t.due_date].filter(Boolean));
    const sorted = [...allDates].sort();
    const minDate = parseISO(sorted[0]);
    const maxDate = parseISO(sorted[sorted.length - 1]);
    return eachDayOfInterval({ start: addDays(minDate, -2), end: addDays(maxDate, 3) });
  }, [tasks]);

  const getBarPos = (task) => {
    if (!task.task_date) return null;
    const startDate = parseISO(task.task_date);
    const endDate = task.due_date ? parseISO(task.due_date) : addDays(startDate, 1);
    const chartStart = dateRange[0];
    const chartEnd = dateRange[dateRange.length - 1];
    if (startDate > chartEnd || endDate < chartStart) return null;
    const offsetDays = Math.max(differenceInDays(startDate, chartStart), 0);
    const duration = Math.max(differenceInDays(endDate, startDate) + 1, 1);
    return { left: offsetDays * COL_W, width: Math.max(duration * COL_W, 60) };
  };

  const getStatusText = (status) =>
    status === 'done' ? 'DONE' : status === 'in_progress' ? 'ACTIVE' : 'TODO';

  const todayIndex = dateRange.findIndex(d => isToday(d));
  const totalGridW = dateRange.length * COL_W;

  return (
    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center px-4 py-3 border-b border-surface-container-highest">
        <h3 className="text-base font-black font-['Manrope'] text-on-surface">📊 Gantt Chart</h3>
      </div>

      {/* Single scroll container — scrolls both X and Y together */}
      <div className="overflow-auto" style={{ maxHeight: 420 }}>
        <div style={{ minWidth: LEFT_W + totalGridW }}>

          {/* ── Header row (sticky top) ── */}
          <div className="flex sticky top-0 z-20">
            {/* Corner cell — sticky top + left */}
            <div
              className="flex-shrink-0 flex items-center px-4 bg-surface-container-low border-r border-b border-surface-container-highest"
              style={{ width: LEFT_W, position: 'sticky', left: 0, zIndex: 30 }}
            >
              <span className="font-bold text-sm text-on-surface">Task Stream</span>
            </div>
            {/* Date columns */}
            {dateRange.map((date, i) => (
              <div
                key={i}
                className={`flex-shrink-0 flex items-center justify-center border-r border-b border-surface-container/30 bg-surface ${isToday(date) ? 'bg-primary/5' : ''}`}
                style={{ width: COL_W, height: ROW_H }}
              >
                <div className={`text-center ${isToday(date) ? 'text-primary' : ''}`}>
                  <p className="text-[10px] uppercase font-bold text-secondary-fixed-dim">{format(date, 'MMM')}</p>
                  <p className="text-sm font-black">{date.getDate()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Task rows ── */}
          {tasks.length === 0 ? (
            <div className="flex">
              <div className="flex items-center justify-center p-6 text-sm text-secondary-fixed-dim" style={{ width: LEFT_W, position: 'sticky', left: 0 }}>
                업무가 없습니다
              </div>
            </div>
          ) : tasks.map((task, i) => {
            const bar = getBarPos(task);
            return (
              <div key={i} className="flex" style={{ height: ROW_H }}>
                {/* Task name — sticky left */}
                <div
                  className="flex-shrink-0 flex flex-col justify-center px-4 bg-surface-container-low border-r border-b border-surface-container-highest/40 hover:bg-surface-container-highest/50 cursor-pointer"
                  style={{ width: LEFT_W, position: 'sticky', left: 0, zIndex: 10 }}
                  onClick={() => onTaskClick?.(task)}
                >
                  <span className="font-bold text-sm text-on-surface truncate">{task.title}</span>
                  <span className="text-[10px] text-secondary-fixed-dim truncate">{task.category || '업무'}</span>
                </div>

                {/* Bar area */}
                <div
                  className="relative border-b border-surface-container-highest/20 cursor-pointer"
                  style={{ width: totalGridW }}
                  onClick={() => onTaskClick?.(task)}
                >
                  {/* Grid lines */}
                  {dateRange.map((_, gi) => (
                    <div
                      key={gi}
                      className="absolute top-0 bottom-0 border-r border-surface-container/20"
                      style={{ left: gi * COL_W, width: COL_W }}
                    />
                  ))}

                  {/* Today line */}
                  {todayIndex >= 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-10"
                      style={{ left: todayIndex * COL_W + COL_W / 2 }}
                    />
                  )}

                  {/* Bar */}
                  {bar && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-9 rounded-full flex items-center px-4 shadow overflow-hidden"
                      style={{
                        left: bar.left + 4,
                        width: bar.width - 8,
                        background:
                          task.status === 'done' ? '#10b981'
                          : task.status === 'in_progress' ? getTaskColor(task)
                          : '#64748b',
                      }}
                    >
                      {task.status === 'in_progress' && (
                        <div className="absolute inset-y-0 left-0 w-1/2 bg-white/20 rounded-l-full" />
                      )}
                      <span className="text-white text-xs font-bold truncate relative z-10">
                        {getStatusText(task.status)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Combined Timeline + Gantt Component ──────────────────────────────
export default function TimelineCalendar({ 
  projectTitle = '프로젝트',
  projectTasks = [], 
  projectAppointments = [], 
  milestones = [], 
  onMilestoneClick,
  onDateSelect, 
  onTaskClick,
  onApptClick,
  projects = []
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState('gantt'); // 'gantt' or 'calendar'
  const [selectedFilterProjectId, setSelectedFilterProjectId] = useState(null);

  // Filter tasks by project
  const filteredTasks = useMemo(() => {
    if (!selectedFilterProjectId) return projectTasks || [];
    return (projectTasks || []).filter(t => t.project_id === selectedFilterProjectId);
  }, [projectTasks, selectedFilterProjectId]);

  const progress = useMemo(() => {
    if (!filteredTasks || !Array.isArray(filteredTasks) || filteredTasks.length === 0) return 0;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    return Math.round((done / filteredTasks.length) * 100);
  }, [filteredTasks]);

  const dateRange = useMemo(() => {
    if (!filteredTasks || !Array.isArray(filteredTasks) || filteredTasks.length === 0) return null;
    const dates = filteredTasks.flatMap(t => [t.task_date, t.due_date].filter(Boolean));
    if (!dates || dates.length === 0) return null;
    const sorted = [...new Set(dates)].sort();
    return { start: sorted[0], end: sorted[sorted.length - 1] };
  }, [filteredTasks]);

  const getProjectColor = (projectId) => {
    if (projectId && projects && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      if (project && project.color) return project.color;
    }
    return ACCENT;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1c1c', fontFamily: 'Manrope, sans-serif', margin: 0 }}>Timeline</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>간트 차트 · 일정 · 프로젝트 진행률을 한눈에 확인하세요</p>
        </div>
        {/* View Toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setView('gantt')}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              background: view === 'gantt' ? '#1a1c1c' : '#f1f5f9',
              color: view === 'gantt' ? '#fff' : '#52525b',
            }}
          >Gantt</button>
          <button
            onClick={() => setView('calendar')}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              background: view === 'calendar' ? '#1a1c1c' : '#f1f5f9',
              color: view === 'calendar' ? '#fff' : '#52525b',
            }}
          >Calendar</button>
        </div>
      </div>

      {/* 프로젝트 필터 pill */}
      {projects && projects.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedFilterProjectId(null)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              background: !selectedFilterProjectId ? '#1a1c1c' : '#f1f5f9',
              color: !selectedFilterProjectId ? '#fff' : '#52525b',
            }}
          >전체</button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedFilterProjectId(p.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                background: selectedFilterProjectId === p.id ? (p.color || '#6366f1') : '#f1f5f9',
                color: selectedFilterProjectId === p.id ? '#fff' : '#52525b',
              }}
            >
              {p.name || p.title}
            </button>
          ))}
        </div>
      )}

      {/* Progress Stats */}
      <div className="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-2xl">
        <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center" style={{ borderColor: getProjectColor(selectedFilterProjectId) }}>
          <span className="text-lg font-black" style={{ color: getProjectColor(selectedFilterProjectId) }}>{progress}%</span>
        </div>
        <div>
          <p className="text-lg font-bold text-on-surface">Total Progress</p>
          <p className="text-sm text-secondary-fixed-dim">
            {dateRange?.end ? `${dateRange.end.slice(5)} 마감` : '마감일 미정'}
          </p>
        </div>
        <div className="flex-1">
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: getProjectColor(selectedFilterProjectId) }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {view === 'gantt' ? (
        <GanttChart 
          tasks={filteredTasks} 
          onTaskClick={onTaskClick}
          projectColor={getProjectColor(selectedFilterProjectId)}
          projects={projects}
        />
      ) : (
        <MilestoneCalendar
          tasks={filteredTasks}
          appointments={projectAppointments}
          projects={projects}
          onTaskClick={onTaskClick}
          onApptClick={onApptClick}
        />
      )}
    </div>
  );
}