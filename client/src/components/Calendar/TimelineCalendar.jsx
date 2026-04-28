import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, isToday, differenceInDays, parseISO } from 'date-fns';
import { ACCENT, CATEGORY_COLORS } from '../../utils/colorMap.js';

// ── Gantt Chart Component ───────────────────────────────────────────────────────
function GanttChart({ tasks = [], onTaskClick, projectColor = ACCENT, projects = [] }) {
  const [viewDays, setViewDays] = useState(14);
  
  // Get task color - could be from project or task itself
  const getTaskColor = (task) => {
    if (task.project_id && projects && projects.length > 0) {
      const project = projects.find(p => p.id === task.project_id);
      if (project && project.color) return project.color;
    }
    return projectColor;
  };
  
  // Generate date range for Gantt chart
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = addDays(start, viewDays - 1);
    return eachDayOfInterval({ start, end });
  }, [viewDays]);

  // Calculate task position and width
  const getTaskBarStyle = (task) => {
    if (!task.task_date) return null;
    
    const startDate = parseISO(task.task_date);
    const endDate = task.due_date ? parseISO(task.due_date) : addDays(startDate, 1);
    
    const chartStart = dateRange[0];
    const chartEnd = dateRange[dateRange.length - 1];
    
    // Calculate offset from chart start
    let offsetDays = differenceInDays(startDate, chartStart);
    if (offsetDays < 0) offsetDays = 0;
    
    // Calculate width
    let duration = differenceInDays(endDate, startDate) + 1;
    if (duration < 1) duration = 1;
    
    // Check if fully outside range
    if (startDate > chartEnd || endDate < chartStart) return null;
    
    return {
      offset: offsetDays,
      width: duration,
      totalDays: differenceInDays(chartEnd, chartStart) + 1
    };
  };

  // Get status colors
  const getStatusStyle = (status) => {
    switch (status) {
      case 'done':
        return { bg: 'from-green-600 to-green-700', icon: 'check_circle', text: 'DONE' };
      case 'in_progress':
        return { bg: 'from-primary to-red-600', icon: 'play_circle', text: 'ACTIVE' };
      default:
        return { bg: 'from-slate-600 to-slate-800', icon: 'radio_button_unchecked', text: 'TODO' };
    }
  };

  const days = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-container-highest">
        <h3 className="text-base font-black font-['Manrope'] text-on-surface">
          📊 Gantt Chart
        </h3>
        <div className="flex gap-1">
          {[7, 14, 21, 30].map(d => (
            <button
              key={d}
              onClick={() => setViewDays(d)}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-colors 
                ${d === viewDays 
                  ? 'bg-primary text-white' 
                  : 'bg-surface text-secondary hover:bg-surface-container-high'
                }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* Gantt Container */}
      <div className="flex" style={{ height: '400px' }}>
        {/* Task List (Left) */}
        <div className="w-48 flex-shrink-0 bg-surface-container-low border-r border-surface-container-highest z-10">
          <div className="h-16 flex items-center px-4 border-b border-surface-container-highest">
            <span className="font-bold text-sm text-on-surface">Task Stream</span>
          </div>
          <div className="overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="p-4 text-center text-sm text-secondary-fixed-dim">
                업무가 없습니다
              </div>
            ) : (
              tasks.map((task, i) => (
                <div 
                  key={i}
                  onClick={() => onTaskClick?.(task)}
                  className="h-16 flex flex-col justify-center px-4 hover:bg-surface-container-highest/50 cursor-pointer border-b border-surface-container-highest/20"
                >
                  <span className="font-bold text-sm text-on-surface truncate">{task.title}</span>
                  <span className="text-[10px] text-secondary-fixed-dim uppercase truncate">
                    {task.category || '업무'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gantt Bars (Right) */}
        <div className="flex-grow overflow-x-auto bg-surface">
          {/* Date Header */}
          <div className="flex h-16 border-b border-surface-container-highest sticky top-0 z-10 bg-surface">
            {dateRange.map((date, i) => {
              const isTodayDate = isToday(date);
              return (
                <div 
                  key={i}
                  className="flex-shrink-0 flex items-center justify-center border-r border-surface-container/30"
                  style={{ width: '64px' }}
                >
                  <div className={`text-center ${isTodayDate ? 'text-primary' : ''}`}>
                    <p className="text-[10px] uppercase font-bold text-secondary-fixed-dim">
                      {format(date, 'MMM')}
                    </p>
                    <p className="text-sm font-black">{date.getDate()}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Background */}
          <div className="relative pt-0">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {dateRange.map((_, i) => (
                <div 
                  key={i}
                  className="flex-shrink-0 border-r border-surface-container/20 h-full"
                  style={{ width: '64px' }}
                />
              ))}
            </div>

            {/* Today Line */}
            {(() => {
              const todayIndex = dateRange.findIndex(d => isToday(d));
              if (todayIndex >= 0) {
                return (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-20"
                    style={{ left: `${todayIndex * 64 + 32}px` }}
                  />
                );
              }
              return null;
            })()}

            {/* Task Bars */}
            <div className="relative z-10">
              {tasks.map((task, i) => {
                const barStyle = getTaskBarStyle(task);
                const statusStyle = getStatusStyle(task.status);

                return (
                  <div
                    key={i}
                    className="h-16 flex items-center cursor-pointer hover:opacity-90 transition-opacity border-b border-surface-container-highest/20"
                    onClick={() => onTaskClick?.(task)}
                  >
                    {barStyle && (() => {
                      const leftPercent = (barStyle.offset / barStyle.totalDays) * 100;
                      const widthPercent = (barStyle.width / barStyle.totalDays) * 100;
                      return (
                        <div
                          className="h-10 rounded-full flex items-center px-4 shadow-lg relative overflow-hidden flex-shrink-0"
                          style={{
                            marginLeft: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 8)}%`,
                            minWidth: '60px',
                            background: task.status === 'done' ? '#10b981' : task.status === 'in_progress' ? getTaskColor(task) : '#64748b',
                          }}
                        >
                          {task.status === 'in_progress' && (
                            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-l-full" style={{ width: '50%' }} />
                          )}
                          {task.status === 'done' && (
                            <span className="material-symbols-outlined text-white ml-auto text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check_circle
                            </span>
                          )}
                          <span className="text-white text-xs font-bold truncate absolute left-4 right-8">
                            {statusStyle.text}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
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