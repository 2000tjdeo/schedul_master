import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, isToday, differenceInDays, parseISO } from 'date-fns';
import { ACCENT, CATEGORY_COLORS } from '../../utils/colorMap.js';

const COL_W = 64; // px per day column
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
    <div className="flex flex-col gap-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black font-['Manrope'] text-on-surface">
          {projectTitle}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setView('gantt')}
            className={`px-3 py-1.5 text-sm font-bold rounded-full transition-colors 
              ${view === 'gantt' 
                ? 'bg-primary text-white' 
                : 'bg-surface text-secondary hover:bg-surface-container-high'
              }`}
          >
            Gantt
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 text-sm font-bold rounded-full transition-colors 
              ${view === 'calendar' 
                ? 'bg-primary text-white' 
                : 'bg-surface text-secondary hover:bg-surface-container-high'
              }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* 프로젝트 필터 */}
      {projects && projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedFilterProjectId(null)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors 
              ${!selectedFilterProjectId 
                ? 'bg-primary text-white' 
                : 'bg-surface text-secondary hover:bg-surface-container-high'
              }`}
          >
            전체
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedFilterProjectId(p.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors 
                ${selectedFilterProjectId === p.id 
                  ? 'text-white' 
                  : 'bg-surface text-secondary'
              }`}
              style={{
                background: selectedFilterProjectId === p.id ? p.color : undefined,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: selectedFilterProjectId === p.id ? '#fff' : p.color }} />
              {p.name}
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
        <div className="bg-surface-container-lowest rounded-2xl p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-base font-black font-['Manrope'] text-on-surface">
              📅 일정
            </h3>
          </div>
          <p className="text-center text-secondary-fixed-dim py-8">
            Calendar view - Use Gantt view for timeline
          </p>
        </div>
      )}
    </div>
  );
}