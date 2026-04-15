import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ACCENT, CATEGORY_COLORS } from '../../utils/colorMap.js';

// ── Helpers ────────────────────────────────────────────────────────────────
function getProjectProgress(tasks) {
  if (!tasks?.length) return 0;
  const done = tasks.filter(t => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

function MilestoneIcon({ type, done }) {
  const icons = {
    start: 'flag',
    milestone: 'radio_button_checked',
    done: 'check_circle',
    review: 'pending_actions',
    release: 'rocket_launch',
  };
  const colors = {
    start: '#6366f1',
    milestone: '#f59e0b',
    done: '#10b981',
    review: '#8b5cf6',
    release: '#ef4444',
  };
  return (
    <span 
      className="material-symbols-outlined"
      style={{ 
        color: done ? '#10b981' : colors[type] || ACCENT,
        fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0"
      }}
    >
      {icons[type] || 'radio_button_checked'}
    </span>
  );
}

// ── Milestone Timeline ────────────────────────────────────────────────────
export function MilestoneTimeline({ title, progress, milestones = [], onMilestoneClick }) {
  const completed = milestones.filter(m => m.done);
  const total = milestones.length || 1;
  const pct = Math.round((completed.length / total) * 100);
  const displayProgress = progress ?? pct;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black font-['Manrope'] text-on-surface">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-red-400 rounded-full transition-all duration-500"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-primary">{displayProgress}% 완료</span>
          </div>
        </div>
        <span className="text-xs text-secondary-fixed-dim">
          {completed.length}/{total} 마일스톤
        </span>
      </div>

      {/* Timeline Line */}
      <div className="relative py-4">
        {/* Background Line */}
        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-surface-container-highest" />
        
        {/* Progress Line */}
        <div 
          className="absolute left-4 top-1/2 h-0.5 bg-gradient-to-r from-primary to-green-500"
          style={{ width: `${pct}%` }}
        />

        {/* Milestones */}
        <div className="relative flex justify-between px-2">
          {milestones.map((m, i) => (
            <button
              key={i}
              onClick={() => onMilestoneClick?.(m)}
              className="group flex flex-col items-center cursor-pointer hover:-translate-y-1 transition-transform"
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg bg-surface z-10 
                  ${m.done ? 'bg-green-100 text-green-600' : 'bg-surface-container-highest text-secondary'}`}
              >
                <MilestoneIcon type={m.type} done={m.done} />
              </div>
              <span className="text-[10px] font-bold mt-2 text-secondary-fixed-dim group-hover:text-primary transition-colors">
                {m.label}
              </span>
              <span className="text-[9px] text-secondary-fixed-dim">
                {m.date?.slice(5)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal Calendar ──────────────────────────────────────────────
export function HorizontalCalendar({ 
  tasks = [], 
  appointments = [], 
  selectedDate, 
  onDateSelect, 
  onTaskClick, 
  onApptClick,
  range = 14 
}) {
  const [viewRange] = useState(range);

  // Generate dates for horizontal display
  const dates = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = addDays(start, viewRange - 1);
    return eachDayOfInterval({ start, end });
  }, [viewRange]);

  // Get events for each date
  const getEvents = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => {
      const start = t.task_date;
      const end = t.due_date || t.task_date;
      return start && dateStr >= start && dateStr <= (end || start);
    });
    const dayAppts = appointments.filter(a => a.date === dateStr);
    return [...dayAppts.map(a => ({ ...a, _type: 'appt' })), ...dayTasks.map(t => ({ ...t, _type: 'task' }))];
  };

  const days = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 overflow-x-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-base font-black font-['Manrope'] text-on-surface horizontal-calendar-header">
          📅 일정
        </h3>
        <div className="flex gap-1">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => {}}
              className={`px-2 py-1 text-[10px] font-bold rounded-full transition-colors 
                ${d === viewRange 
                  ? 'bg-primary text-white' 
                  : 'bg-surface text-secondary hover:bg-surface-container-high'
                }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* Day Headers */}
      <div className="flex border-b border-surface-container-highest pb-2 mb-2">
        {dates.map((date, i) => (
          <div 
            key={i} 
            className="flex-1 min-w-[48px] text-center"
          >
            <span className="text-[9px] font-bold text-secondary-fixed-dim uppercase">
              {days[date.getDay()]}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex gap-1">
        {dates.map((date, i) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const events = getEvents(date);
          const isSelected = selectedDate === dateStr;
          const isTodayDate = isToday(date);
          
          return (
            <button
              key={i}
              onClick={() => onDateSelect?.(dateStr)}
              className="flex-1 min-w-[48px] min-h-[64px] p-1 rounded-lg flex flex-col items-center gap-1 transition-all hover:bg-surface"
            >
              {/* Date Number */}
              <span 
                className={`text-sm font-bold ${
                  isTodayDate 
                    ? 'text-primary' 
                    : isSelected 
                      ? 'bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center'
                      : 'text-on-surface'
                }`}
              >
                {date.getDate()}
              </span>
              
              {/* Event Dots */}
              <div className="flex flex-wrap justify-center gap-[2px] max-h-8 overflow-hidden">
                {events.slice(0, 3).map((e, j) => (
                  <span
                    key={j}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ 
                      background: e._type === 'appt' 
                        ? (e.color || '#6366f1') 
                        : (CATEGORY_COLORS[e.category]?.border || ACCENT) 
                    }}
                  />
                ))}
                {events.length > 3 && (
                  <span className="text-[8px] font-bold text-secondary-fixed-dim">+{events.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Combined Timeline + Calendar Component ──────────────────────────────
export default function TimelineCalendar({ 
  projectTitle = '프로젝트',
  projectTasks = [], 
  projectAppointments = [], 
  milestones = [], 
  onMilestoneClick,
  onDateSelect, 
  onTaskClick,
  onApptClick 
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const progress = getProjectProgress(projectTasks);

  // Default milestones if not provided
  const defaultMilestones = milestones.length > 0 ? milestones : [
    { label: '시작', date: new Date().toISOString().slice(0, 10), type: 'start', done: progress > 0 },
    { label: '진행', date: null, type: 'milestone', done: false },
    { label: '완료', date: null, type: 'done', done: progress >= 100 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Milestone Timeline */}
      <MilestoneTimeline 
        title={projectTitle}
        progress={progress}
        milestones={defaultMilestones}
        onMilestoneClick={onMilestoneClick}
      />
      
      {/* Horizontal Calendar */}
      <HorizontalCalendar 
        tasks={projectTasks}
        appointments={projectAppointments}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date);
          onDateSelect?.(date);
        }}
        onTaskClick={onTaskClick}
        onApptClick={onApptClick}
      />
    </div>
  );
}