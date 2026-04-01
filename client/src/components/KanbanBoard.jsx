import React, { useState, useRef } from 'react';
import TaskCard from './TaskCard.jsx';

const COLUMNS = [
  {
    id: 'todo',
    label: '할 일',
    headerClass: 'bg-slate-500',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    countClass: 'bg-slate-100 text-slate-600',
    emptyIcon: (
      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'in_progress',
    label: '진행 중',
    headerClass: 'bg-amber-500',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    countClass: 'bg-amber-100 text-amber-700',
    emptyIcon: (
      <svg className="w-8 h-8 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'done',
    label: '완료',
    headerClass: 'bg-emerald-500',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    countClass: 'bg-emerald-100 text-emerald-700',
    emptyIcon: (
      <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function KanbanColumn({ column, tasks, onTaskClick, onMoveTask, onCreateTask }) {
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOver(true);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(Number(taskId), column.id);
    }
  };

  return (
    <div
      className={`flex flex-col min-w-[280px] flex-1 rounded-xl border ${column.borderClass} ${column.bgClass} transition-all duration-200 ${dragOver ? 'ring-2 ring-indigo-400 ring-offset-1 shadow-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${column.headerClass}`} />
          <h2 className="font-semibold text-slate-700 text-sm">{column.label}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${column.countClass}`}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onCreateTask(column.id)}
          className="p-1 rounded-md hover:bg-white/70 text-slate-400 hover:text-slate-600 transition-colors"
          title={`${column.label}에 작업 추가`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 px-3 pb-4 space-y-3 overflow-y-auto min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
            {column.emptyIcon}
            <p className="text-xs text-slate-400">작업이 없습니다</p>
          </div>
        ) : (
          tasks.map(task => (
            <DraggableCard key={task.id} task={task} onTaskClick={onTaskClick} onMoveTask={onMoveTask} />
          ))
        )}

        {/* Add task shortcut at bottom */}
        <button
          onClick={() => onCreateTask(column.id)}
          className="w-full py-2 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 hover:bg-white/60 rounded-lg border border-dashed border-slate-200 hover:border-indigo-300 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          작업 추가
        </button>
      </div>
    </div>
  );
}

function DraggableCard({ task, onTaskClick, onMoveTask }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCard
        task={task}
        onClick={() => onTaskClick(task)}
        onMoveTask={onMoveTask}
      />
    </div>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onMoveTask, onCreateTask }) {
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map(column => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={tasksByStatus[column.id] || []}
          onTaskClick={onTaskClick}
          onMoveTask={onMoveTask}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  );
}
