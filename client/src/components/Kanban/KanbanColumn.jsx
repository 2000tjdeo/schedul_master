import React, { useState, useRef } from 'react';
import KanbanCard from './KanbanCard.jsx';

const COLUMN_CONFIG = {
  todo: {
    label: '할 일',
    dot: '#64748b',
    count: { bg: '#f1f5f9', color: '#475569' },
  },
  in_progress: {
    label: '진행 중',
    dot: '#f59e0b',
    count: { bg: '#fef3c7', color: '#92400e' },
  },
  done: {
    label: '완료',
    dot: '#10b981',
    count: { bg: '#d1fae5', color: '#065f46' },
  },
};

function DraggableCard({ task, onTaskClick, onMoveTask }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div draggable onDragStart={handleDragStart} style={{ cursor: 'grab' }}>
      <KanbanCard
        task={task}
        onClick={() => onTaskClick(task)}
        onMoveTask={onMoveTask}
      />
    </div>
  );
}

export default function KanbanColumn({ columnId, tasks, onTaskClick, onMoveTask, onCreateTask }) {
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const config = COLUMN_CONFIG[columnId];

  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnter = (e) => { e.preventDefault(); dragCounter.current++; setDragOver(true); };
  const handleDragLeave = () => { dragCounter.current--; if (dragCounter.current === 0) setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onMoveTask(Number(taskId), columnId);
  };

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        minWidth: 280, flex: 1,
        background: dragOver ? '#f0f9ff' : '#fafafa',
        borderRadius: 12, border: `1px solid ${dragOver ? '#60a5fa' : '#f0f0f0'}`,
        boxShadow: dragOver ? '0 0 0 2px #bfdbfe' : 'none',
        transition: 'all 0.15s',
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.dot }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>{config.label}</span>
          <span style={{
            padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: config.count.bg, color: config.count.color,
          }}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onCreateTask(columnId)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6 }}
          title="작업 추가"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 180 }}>
        {tasks.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, color: '#d1d5db', fontSize: 12 }}>
            작업이 없습니다
          </div>
        ) : (
          tasks.map(task => (
            <DraggableCard key={task.id} task={task} onTaskClick={onTaskClick} onMoveTask={onMoveTask} />
          ))
        )}

        <button
          onClick={() => onCreateTask(columnId)}
          style={{
            width: '100%', padding: '8px', border: '1px dashed #e5e7eb',
            borderRadius: 8, background: 'transparent', cursor: 'pointer',
            color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#374151'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          작업 추가
        </button>
      </div>
    </div>
  );
}
