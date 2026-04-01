import React from 'react';
import KanbanColumn from './KanbanColumn.jsx';

const COLUMNS = ['todo', 'in_progress', 'done'];

export default function KanbanBoard({ tasks, onTaskClick, onMoveTask, onCreateTask }) {
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', overflowX: 'auto', paddingBottom: 8 }}>
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col}
          columnId={col}
          tasks={tasksByStatus[col] || []}
          onTaskClick={onTaskClick}
          onMoveTask={onMoveTask}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  );
}
